#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# FILE-BASED DEPLOYMENT - ikfzdigitalzulassung.de (Hostinger + LiteSpeed Passenger)
# ═══════════════════════════════════════════════════════════════════
#
# Server setup (Hostinger shared Node.js via Passenger):
#   - App root:   /home/<SSH_USER>/domains/ikfzdigitalzulassung.de/nodejs/
#   - Startup:    server.js  (set in .htaccess PassengerStartupFile)
#   - Restart:    touch nodejs/tmp/restart.txt  (PassengerRestartDir)
#   - NO pm2, NO atomic swap — rsync directly into nodejs/, then touch restart
#
# Usage:
#   bash deploy/hostinger-deploy.sh          # Full build + deploy
#   bash deploy/hostinger-deploy.sh --quick  # Skip build, just upload + restart
#
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────
# UPDATE THESE VALUES for your Hostinger server:
SSH_HOST="88.223.85.114"
SSH_PORT="65002"
SSH_USER="u104276643"
# Passenger app root — this is where server.js must live
REMOTE_APP_DIR="/home/${SSH_USER}/domains/ikfzdigitalzulassung.de/nodejs"
# Persistent env file on the server (set once, never overwritten by deploy)
REMOTE_ENV_FILE="/home/${SSH_USER}/env/ikfzdigitalzulassung.env"

# Local paths (relative to project root)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STANDALONE_DIR="$PROJECT_ROOT/.next/standalone"
STATIC_DIR="$PROJECT_ROOT/.next/static"
PUBLIC_DIR="$PROJECT_ROOT/public"

# SSH command shortcut (-t forces TTY — Hostinger requires it)
SSH_CMD="ssh -t -o StrictHostKeyChecking=no -i $HOME/.ssh/id_ed25519 -p $SSH_PORT $SSH_USER@$SSH_HOST"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }
step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ── Parse Args ────────────────────────────────────────────────────
SKIP_BUILD=false
if [[ "${1:-}" == "--quick" ]]; then
    SKIP_BUILD=true
    warn "Quick mode: skipping build, uploading existing .next/standalone/"
fi

# ── Preflight Checks ─────────────────────────────────────────────
step "1/6 · Preflight Checks"

cd "$PROJECT_ROOT"
echo "  Project root: $PROJECT_ROOT"

echo -n "  Testing SSH connection... "
if $SSH_CMD "echo ok" 2>/dev/null; then
    log "SSH connection OK"
else
    err "Cannot connect to $SSH_HOST:$SSH_PORT — check your SSH credentials"
fi

command -v rsync >/dev/null 2>&1 || err "rsync not found — install it first"

# ── Build ─────────────────────────────────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
    step "2/6 · Building Production App"

    echo "  Generating Prisma client..."
    npx prisma generate

    # For Hostinger deploy: build happens locally, production DB is on the remote server.
    # Use local dev.db for build-time page pre-rendering. ISR (revalidate=60) will
    # replace this data with production DB data within 60s of the first request.
    if [ -f "$PROJECT_ROOT/prisma/dev.db" ]; then
        export DB_PATH="$PROJECT_ROOT/prisma/dev.db"
        echo "  ℹ DB_PATH=$DB_PATH (build-time only; ISR fetches from production DB at runtime)"
    else
        echo "  ⚠️  No local dev.db found — build pages may fail to pre-render"
    fi

    echo "  Building Next.js (standalone mode)..."
    npm run build

    [ -d "$STANDALONE_DIR" ] || err "Standalone dir not found at $STANDALONE_DIR"
    [ -f "$STANDALONE_DIR/server.js" ] || err "server.js not found in standalone dir"

    log "Build complete — BUILD_ID: $(cat .next/BUILD_ID)"
else
    step "2/6 · Build (SKIPPED)"
    [ -d "$STANDALONE_DIR" ] || err "No standalone build found. Run without --quick first."
fi

# ── Prepare Deploy Package ────────────────────────────────────────
step "3/6 · Preparing Deploy Package"

echo "  Copying .next/static → standalone/.next/static..."
rm -rf "$STANDALONE_DIR/.next/static"
cp -r "$STATIC_DIR" "$STANDALONE_DIR/.next/static"

echo "  Copying public/ → standalone/public..."
rm -rf "$STANDALONE_DIR/public"
cp -r "$PUBLIC_DIR" "$STANDALONE_DIR/public"
echo "  Copying src/data/ → standalone/src/data/ (CSV + JSON for ISR)..."
mkdir -p "$STANDALONE_DIR/src/data"
cp -r "$PROJECT_ROOT/src/data/"*.csv "$PROJECT_ROOT/src/data/"*.json "$STANDALONE_DIR/src/data/"

echo "  Copying scripts/server-cleanup.sh → standalone/scripts/..."
mkdir -p "$STANDALONE_DIR/scripts"
cp "$PROJECT_ROOT/scripts/server-cleanup.sh" "$STANDALONE_DIR/scripts/"

# Database is persistent on server — DO NOT include in deploy package
# On first deploy, seed DB manually: scp prisma/dev.db server:/path/to/data/production.db
mkdir -p "$STANDALONE_DIR/prisma"

# Ensure tmp/ dir exists for Passenger restart trigger
mkdir -p "$STANDALONE_DIR/tmp"

# Remove any local dev artifacts
rm -f "$STANDALONE_DIR/.env" "$STANDALONE_DIR/.env.local"

DEPLOY_SIZE=$(du -sh "$STANDALONE_DIR" | cut -f1)
log "Deploy package ready: $DEPLOY_SIZE"

# ── Upload to Server (rsync directly into nodejs/) ────────────────
step "4/6 · Uploading to Server via rsync"

echo "  Target: $SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"
echo "  (rsync with --delete — this will replace all files in nodejs/)"

rsync -az --delete --checksum \
    --exclude='console.log' \
    --exclude='stderr.log' \
    --exclude='.env' \
    --exclude='prisma/*.db' \
    --exclude='prisma/*.db-journal' \
    --exclude='/data/' \
    --exclude='public/uploads/documents/' \
    --exclude='public/uploads/order-documents/' \
    -e "ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_ed25519 -p $SSH_PORT" \
    "$STANDALONE_DIR/" \
    "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"

log "Upload complete"

# ── Setup Env & Native Dependencies & Restart ────────────────────
step "5/6 · Setting Up Environment & Triggering Passenger Restart"

$SSH_CMD bash << REMOTE_SCRIPT
set -euo pipefail

REMOTE_APP_DIR="$REMOTE_APP_DIR"
REMOTE_ENV_FILE="$REMOTE_ENV_FILE"
NODE_BIN="/opt/alt/alt-nodejs20/root/bin"
NPM="\$NODE_BIN/npm"

# Copy .env from persistent location
if [ -f "\$REMOTE_ENV_FILE" ]; then
    cp "\$REMOTE_ENV_FILE" "\$REMOTE_APP_DIR/.env"
    echo "  ✅ .env copied from \$REMOTE_ENV_FILE"
else
    echo "  ⚠️  No env file found at \$REMOTE_ENV_FILE"
fi

# ── Persistent database setup ────────────────────────────────────
# Database lives OUTSIDE the app directory so rsync --delete can't touch it
DATA_DIR="/home/${SSH_USER}/data"
DB_FILE="\$DATA_DIR/production.db"
mkdir -p "\$DATA_DIR"

if [ ! -f "\$DB_FILE" ]; then
    # Check if there's an old DB in the app dir from a previous deploy
    if [ -f "\$REMOTE_APP_DIR/prisma/dev.db" ]; then
        echo "  📋 Migrating existing dev.db → \$DB_FILE"
        cp "\$REMOTE_APP_DIR/prisma/dev.db" "\$DB_FILE"
    else
        echo "  ⚠️  No production database found. Upload one with:"
        echo "     scp -P $SSH_PORT prisma/dev.db $SSH_USER@$SSH_HOST:\$DB_FILE"
    fi
else
    echo "  ✅ Production database exists at \$DB_FILE — NOT overwriting"
fi

# Symlink database into app directory so the app can find it
mkdir -p "\$REMOTE_APP_DIR/prisma"
ln -sf "\$DB_FILE" "\$REMOTE_APP_DIR/prisma/production.db"
echo "  ✅ Database symlinked: prisma/production.db → \$DB_FILE"

# Ensure DB_PATH is set in .env
if [ -f "\$REMOTE_APP_DIR/.env" ]; then
    grep -q '^DB_PATH=' "\$REMOTE_APP_DIR/.env" || echo "DB_PATH=\$DB_FILE" >> "\$REMOTE_APP_DIR/.env"
fi

# ── Fix: Install Linux-native better-sqlite3 binary ──────────────
# The standalone build is compiled on macOS and only contains darwin binaries.
echo "  📦 Installing better-sqlite3 for linux-x64..."
cd "\$REMOTE_APP_DIR"
PATH="\$NODE_BIN:\$PATH" \$NPM install better-sqlite3 --no-save --ignore-scripts 2>&1 | grep -E 'added|error|warn' | head -5 || true
PATH="\$NODE_BIN:\$PATH" \$NPM rebuild better-sqlite3 2>&1 | grep -E 'rebuilt|error' | head -5 || true
echo "  ✅ better-sqlite3 linux binary installed"

# ── Fix: Install Linux-native sharp binary ──────────────────────
echo "  📦 Installing sharp for linux-x64..."
cd "\$REMOTE_APP_DIR"
PATH="\$NODE_BIN:\$PATH" \$NPM install --os=linux --cpu=x64 sharp --no-save 2>&1 | grep -E 'added|changed|error|warn' | head -5 || true
echo "  ✅ sharp linux-x64 binary installed"

# Ensure tmp/ exists (Passenger restarts via this dir)
mkdir -p "\$REMOTE_APP_DIR/tmp"

# Clear old console.log so we get fresh startup logs
rm -f "\$REMOTE_APP_DIR/console.log"

# Touch restart.txt — Passenger watches this to reload the app
touch "\$REMOTE_APP_DIR/tmp/restart.txt"
echo "  ✅ Passenger restart triggered (tmp/restart.txt touched)"

# Show new BUILD_ID
echo "  🔖 New BUILD_ID on server: \$(cat \$REMOTE_APP_DIR/.next/BUILD_ID 2>/dev/null || echo 'unknown')"
REMOTE_SCRIPT

log "Restart triggered"

# ── Health Check ──────────────────────────────────────────────────
step "6/6 · Health Check"

echo "  Waiting 8 seconds for Passenger to reload..."
sleep 8

# External check
EXT_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://ikfzdigitalzulassung.de/ 2>/dev/null || echo "000")
if [ "$EXT_CODE" = "200" ]; then
    log "External health check: HTTP $EXT_CODE ✓"
else
    warn "External check HTTP $EXT_CODE — may still be reloading, check again in a moment"
fi

# Show server logs
echo ""
echo "  Latest server logs:"
$SSH_CMD "tail -15 $REMOTE_APP_DIR/console.log" 2>/dev/null || true

# ── Summary ───────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  🌐 Site:      https://ikfzdigitalzulassung.de"
echo "  📁 App dir:   $REMOTE_APP_DIR"
echo "  🔖 BUILD_ID:  $(cat $PROJECT_ROOT/.next/BUILD_ID 2>/dev/null || echo 'unknown')"
echo ""
echo "  To view logs:"
echo "    ssh -p $SSH_PORT $SSH_USER@$SSH_HOST 'tail -f $REMOTE_APP_DIR/console.log'"
echo ""
echo "  To force restart:"
echo "    ssh -p $SSH_PORT $SSH_USER@$SSH_HOST 'touch $REMOTE_APP_DIR/tmp/restart.txt'"
echo ""
