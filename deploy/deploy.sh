#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# DEPLOYMENT — ikfzdigitalzulassung.de (Hostinger Shared + LiteSpeed Passenger)
# ═══════════════════════════════════════════════════════════════════
#
# Builds locally on macOS, cross-compiles native modules for Linux,
# uploads via rsync, and triggers a Passenger restart.
#
# Server layout:
#   App root:     /home/<SSH_USER>/domains/ikfzdigitalzulassung.de/nodejs/
#   Startup file: server.js  (PassengerStartupFile in .htaccess)
#   Restart:      touch nodejs/tmp/restart.txt
#   Database:     /home/<SSH_USER>/data/production.db  (persistent, never overwritten)
#   Env file:     /home/<SSH_USER>/env/ikfzdigitalzulassung.env  (persistent)
#
# Usage:
#   bash deploy/deploy.sh             # Full build + deploy
#   bash deploy/deploy.sh --quick     # Skip build, upload existing standalone + restart
#   bash deploy/deploy.sh --setup     # First-time server setup (cron jobs)
#
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────
SSH_HOST="88.223.85.114"
SSH_PORT="65002"
SSH_USER="u104276643"
REMOTE_APP_DIR="/home/${SSH_USER}/domains/ikfzdigitalzulassung.de/nodejs"
REMOTE_ENV_FILE="/home/${SSH_USER}/env/ikfzdigitalzulassung.env"
REMOTE_DATA_DIR="/home/${SSH_USER}/data"
SITE_URL="https://ikfzdigitalzulassung.de"

# Local paths
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STANDALONE_DIR="$PROJECT_ROOT/.next/standalone"
STATIC_DIR="$PROJECT_ROOT/.next/static"
PUBLIC_DIR="$PROJECT_ROOT/public"

# SSH — Hostinger requires TTY (-t) for interactive commands
SSH_CMD="ssh -t -o StrictHostKeyChecking=no -i $HOME/.ssh/id_ed25519 -p $SSH_PORT $SSH_USER@$SSH_HOST"
SSH_RSYNC="ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_ed25519 -p $SSH_PORT"

# Server Node.js (Hostinger alt-nodejs20)
REMOTE_NODE_BIN="/opt/alt/alt-nodejs20/root/bin"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
err()  { echo -e "${RED}  ❌ $1${NC}"; exit 1; }
step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ── Parse Args ────────────────────────────────────────────────────
MODE="full"
case "${1:-}" in
    --quick) MODE="quick"; warn "Quick mode: skipping build" ;;
    --setup) MODE="setup" ;;
esac

# ══════════════════════════════════════════════════════════════════
# --setup: One-time server cron jobs
# ══════════════════════════════════════════════════════════════════
if [ "$MODE" = "setup" ]; then
    step "Server Setup — Cron Jobs"
    echo "  Reading CRON_SECRET from server env file..."

    $SSH_CMD bash << 'SETUP_SCRIPT'
set -euo pipefail
ENV_FILE="/home/${USER}/env/ikfzdigitalzulassung.env"
APP_DIR="/home/${USER}/domains/ikfzdigitalzulassung.de/nodejs"
SITE="https://ikfzdigitalzulassung.de"

if [ ! -f "$ENV_FILE" ]; then
    echo "  ❌ Env file not found at $ENV_FILE — create it first"
    exit 1
fi

CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d'=' -f2-)
if [ -z "$CRON_SECRET" ]; then
    echo "  ❌ CRON_SECRET not set in $ENV_FILE"
    echo "     Generate one: openssl rand -base64 32"
    exit 1
fi

# Backup and rebuild crontab
crontab -l > /tmp/crontab-backup.txt 2>/dev/null || true
crontab -l 2>/dev/null | grep -v 'ikfzdigitalzulassung' | grep -v '^#.*ikfzdigitalzulassung' > /tmp/crontab-clean.txt || true

cat >> /tmp/crontab-clean.txt << EOF
# ── ikfzdigitalzulassung.de cron jobs ─────────────────────────────
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$SITE/api/cron/publish-scheduled" > /dev/null 2>&1
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$SITE/api/cron/send-scheduled" > /dev/null 2>&1
0 */8 * * * bash $APP_DIR/scripts/server-cleanup.sh --execute --quiet 2>/dev/null
EOF

crontab /tmp/crontab-clean.txt
echo "  ✅ Crontab updated!"
echo ""
crontab -l
SETUP_SCRIPT
    exit 0
fi

# ══════════════════════════════════════════════════════════════════
# 1. Preflight
# ══════════════════════════════════════════════════════════════════
step "1/6 · Preflight Checks"
cd "$PROJECT_ROOT"
echo "  Project root: $PROJECT_ROOT"

echo -n "  Testing SSH... "
if $SSH_CMD "echo ok" 2>/dev/null; then
    log "SSH OK"
else
    err "Cannot connect to $SSH_HOST:$SSH_PORT"
fi

command -v rsync >/dev/null 2>&1 || err "rsync not found"
command -v curl  >/dev/null 2>&1 || err "curl not found"

# ══════════════════════════════════════════════════════════════════
# 2. Build
# ══════════════════════════════════════════════════════════════════
if [ "$MODE" = "full" ]; then
    step "2/6 · Building Production App"

    echo "  Generating Prisma client..."
    npx prisma generate

    # Use local dev.db for build-time pre-rendering.
    # ISR (revalidate) refreshes from the production DB at runtime.
    if [ -f "$PROJECT_ROOT/prisma/dev.db" ]; then
        export DB_PATH="$PROJECT_ROOT/prisma/dev.db"
        echo "  DB_PATH=$DB_PATH (build-time only)"
    else
        warn "No local dev.db — static pages may fail to pre-render"
    fi

    echo "  Building Next.js (standalone mode)..."
    npm run build

    [ -d "$STANDALONE_DIR" ] || err "Standalone dir missing"
    [ -f "$STANDALONE_DIR/server.js" ] || err "server.js missing in standalone"

    log "Build complete — BUILD_ID: $(cat .next/BUILD_ID)"
else
    step "2/6 · Build (SKIPPED)"
    [ -d "$STANDALONE_DIR" ] || err "No standalone build found. Run without --quick first."
fi

# ══════════════════════════════════════════════════════════════════
# 3. Prepare Deploy Package
# ══════════════════════════════════════════════════════════════════
step "3/6 · Preparing Deploy Package"

echo "  Copying .next/static → standalone/.next/static..."
rm -rf "$STANDALONE_DIR/.next/static"
cp -r "$STATIC_DIR" "$STANDALONE_DIR/.next/static"

echo "  Copying public/ → standalone/public..."
rm -rf "$STANDALONE_DIR/public"
cp -r "$PUBLIC_DIR" "$STANDALONE_DIR/public"

echo "  Copying src/data/ → standalone/src/data/..."
mkdir -p "$STANDALONE_DIR/src/data"
cp -r "$PROJECT_ROOT/src/data/"*.csv "$PROJECT_ROOT/src/data/"*.json "$STANDALONE_DIR/src/data/" 2>/dev/null || true

if [ -f "$PROJECT_ROOT/scripts/server-cleanup.sh" ]; then
    mkdir -p "$STANDALONE_DIR/scripts"
    cp "$PROJECT_ROOT/scripts/server-cleanup.sh" "$STANDALONE_DIR/scripts/"
fi

mkdir -p "$STANDALONE_DIR/prisma" "$STANDALONE_DIR/tmp"
rm -f "$STANDALONE_DIR/.env" "$STANDALONE_DIR/.env.local"

# ── Cross-compile native modules for Linux x64 ───────────────────
# macOS build produces darwin binaries → replace with prebuilt Linux ones.
# Hostinger runs Node 20 (ABI v115) on linux-x64.

echo "  Fetching better-sqlite3 linux-x64 prebuilt..."
BS3_VERSION=$(node -e "console.log(require('$PROJECT_ROOT/node_modules/better-sqlite3/package.json').version)")
BS3_ABI="v115"  # Node 20
BS3_URL="https://github.com/WiseLibs/better-sqlite3/releases/download/v${BS3_VERSION}/better-sqlite3-v${BS3_VERSION}-node-${BS3_ABI}-linux-x64.tar.gz"
BS3_TMP=$(mktemp -d)

if curl -sL "$BS3_URL" -o "$BS3_TMP/bs3.tar.gz" && tar xzf "$BS3_TMP/bs3.tar.gz" -C "$BS3_TMP"; then
    LINUX_NODE="$BS3_TMP/build/Release/better_sqlite3.node"
    if file "$LINUX_NODE" | grep -q "ELF 64-bit"; then
        BS3_TARGET="$STANDALONE_DIR/node_modules/better-sqlite3/build/Release"
        mkdir -p "$BS3_TARGET"
        cp "$LINUX_NODE" "$BS3_TARGET/better_sqlite3.node"
        log "better-sqlite3 v${BS3_VERSION} linux-x64 binary ✓"
    else
        warn "Downloaded binary is not ELF — server may fail to start"
    fi
else
    warn "Could not download better-sqlite3 prebuilt binary"
fi
rm -rf "$BS3_TMP"

DEPLOY_SIZE=$(du -sh "$STANDALONE_DIR" | cut -f1)
log "Deploy package ready: $DEPLOY_SIZE"

# ══════════════════════════════════════════════════════════════════
# 4. Upload
# ══════════════════════════════════════════════════════════════════
step "4/6 · Uploading via rsync"

echo "  Target: $SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"

rsync -az --delete --checksum \
    --exclude='console.log' \
    --exclude='stderr.log' \
    --exclude='.env' \
    --exclude='prisma/*.db' \
    --exclude='prisma/*.db-journal' \
    --exclude='/data/' \
    --exclude='public/uploads/documents/' \
    --exclude='public/uploads/order-documents/' \
    -e "$SSH_RSYNC" \
    "$STANDALONE_DIR/" \
    "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"

log "Upload complete"

# ══════════════════════════════════════════════════════════════════
# 5. Server-side setup & restart
# ══════════════════════════════════════════════════════════════════
step "5/6 · Server Setup & Passenger Restart"

$SSH_CMD bash << REMOTE_SCRIPT
set -euo pipefail

REMOTE_APP_DIR="$REMOTE_APP_DIR"
REMOTE_ENV_FILE="$REMOTE_ENV_FILE"
DATA_DIR="$REMOTE_DATA_DIR"
DB_FILE="\$DATA_DIR/production.db"
NODE_BIN="$REMOTE_NODE_BIN"
NPM="\$NODE_BIN/npm"

# ── .env ──
if [ -f "\$REMOTE_ENV_FILE" ]; then
    cp "\$REMOTE_ENV_FILE" "\$REMOTE_APP_DIR/.env"
    echo "  ✅ .env copied"
else
    echo "  ⚠️  No env file at \$REMOTE_ENV_FILE"
fi

# ── Database ──
mkdir -p "\$DATA_DIR"
if [ ! -f "\$DB_FILE" ]; then
    if [ -f "\$REMOTE_APP_DIR/prisma/dev.db" ]; then
        cp "\$REMOTE_APP_DIR/prisma/dev.db" "\$DB_FILE"
        echo "  📋 Migrated dev.db → \$DB_FILE"
    else
        echo "  ⚠️  No database. Upload: scp -P $SSH_PORT prisma/dev.db $SSH_USER@$SSH_HOST:\$DB_FILE"
    fi
else
    echo "  ✅ Database exists at \$DB_FILE"
fi

mkdir -p "\$REMOTE_APP_DIR/prisma"
ln -sf "\$DB_FILE" "\$REMOTE_APP_DIR/prisma/production.db"

# ── .env enforcement ──
if [ -f "\$REMOTE_APP_DIR/.env" ]; then
    grep -q '^DB_PATH=' "\$REMOTE_APP_DIR/.env" || echo "DB_PATH=\$DB_FILE" >> "\$REMOTE_APP_DIR/.env"
    if grep -q '^NODE_ENV=' "\$REMOTE_APP_DIR/.env"; then
        sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "\$REMOTE_APP_DIR/.env"
    else
        echo "NODE_ENV=production" >> "\$REMOTE_APP_DIR/.env"
    fi
fi
echo "  ✅ NODE_ENV=production"

# ── sharp for linux-x64 ──
cd "\$REMOTE_APP_DIR"
PATH="\$NODE_BIN:\$PATH" \$NPM install --os=linux --cpu=x64 sharp --no-save 2>&1 | grep -E 'added|changed|error' | head -3 || true
echo "  ✅ sharp linux-x64"

# ── Restart Passenger ──
mkdir -p "\$REMOTE_APP_DIR/tmp"
rm -f "\$REMOTE_APP_DIR/console.log"
touch "\$REMOTE_APP_DIR/tmp/restart.txt"
echo "  ✅ Passenger restart triggered"
echo "  🔖 BUILD_ID: \$(cat \$REMOTE_APP_DIR/.next/BUILD_ID 2>/dev/null || echo 'unknown')"
REMOTE_SCRIPT

log "Server configured"

# ══════════════════════════════════════════════════════════════════
# 6. Health Check
# ══════════════════════════════════════════════════════════════════
step "6/6 · Health Check"

echo "  Waiting 10s for Passenger to reload..."
sleep 10

EXT_CODE=$(curl -sL -o /dev/null -w '%{http_code}' --max-time 15 "$SITE_URL/" 2>/dev/null || echo "000")
if [ "$EXT_CODE" = "200" ]; then
    log "Site is UP — HTTP $EXT_CODE"
else
    warn "HTTP $EXT_CODE — may still be reloading"
fi

echo ""
echo "  Latest server logs:"
$SSH_CMD "tail -15 $REMOTE_APP_DIR/console.log" 2>/dev/null || true

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  🌐 Site:      $SITE_URL"
echo "  🔖 BUILD_ID:  $(cat $PROJECT_ROOT/.next/BUILD_ID 2>/dev/null || echo 'unknown')"
echo ""
echo "  Logs:    ssh -p $SSH_PORT $SSH_USER@$SSH_HOST 'tail -f $REMOTE_APP_DIR/console.log'"
echo "  Restart: ssh -p $SSH_PORT $SSH_USER@$SSH_HOST 'touch $REMOTE_APP_DIR/tmp/restart.txt'"
echo ""
