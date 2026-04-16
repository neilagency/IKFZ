#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Server Crontab Setup — ikfzdigitalzulassung.de
# ═══════════════════════════════════════════════════════════════════
#
# Replaces GitHub Actions cron jobs with server-side crontab entries.
# Run this ONCE on the Hostinger server after deployment.
#
# Usage (on server):
#   bash setup-cron.sh
#
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Read CRON_SECRET from env file ────────────────────────────────
ENV_FILE="/home/${USER}/env/ikfzdigitalzulassung.env"
if [ -f "$ENV_FILE" ]; then
    CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d'=' -f2-)
else
    echo "❌ Env file not found at $ENV_FILE"
    echo "   Please create it first (see .env.production template)"
    exit 1
fi

if [ -z "$CRON_SECRET" ] || [ "$CRON_SECRET" = "<CHANGE_ME_GENERATE_WITH: openssl rand -base64 32>" ]; then
    echo "❌ CRON_SECRET is not set in $ENV_FILE"
    echo "   Generate one: openssl rand -base64 32"
    exit 1
fi

SITE="https://ikfzdigitalzulassung.de"
APP_DIR="/home/${USER}/domains/ikfzdigitalzulassung.de/nodejs"

# ── Define cron entries ───────────────────────────────────────────
# 1. Publish scheduled posts — every 5 minutes
# 2. Send scheduled email campaigns — every 5 minutes
# 3. Server cleanup — every 8 hours (safe: logs, temp files, stale cache)
CRON_ENTRIES=$(cat <<EOF
# ── ikfzdigitalzulassung.de cron jobs ─────────────────────────────
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$SITE/api/cron/publish-scheduled" > /dev/null 2>&1
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" "$SITE/api/cron/send-scheduled" > /dev/null 2>&1
0 */8 * * * bash $APP_DIR/scripts/server-cleanup.sh --execute --quiet 2>/dev/null
EOF
)

# ── Remove old entries and add new ones ───────────────────────────
# Backup current crontab
crontab -l > /tmp/crontab-backup.txt 2>/dev/null || true

# Remove any existing ikfzdigitalzulassung entries
crontab -l 2>/dev/null | grep -v 'ikfzdigitalzulassung' | grep -v '^#.*ikfzdigitalzulassung' > /tmp/crontab-clean.txt || true

# Append new entries
echo "$CRON_ENTRIES" >> /tmp/crontab-clean.txt

# Install
crontab /tmp/crontab-clean.txt

echo "✅ Crontab updated successfully!"
echo ""
echo "Current cron jobs:"
crontab -l
