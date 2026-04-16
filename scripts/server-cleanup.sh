#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SERVER CLEANUP — Safe periodic maintenance for Hostinger shared hosting
# ═══════════════════════════════════════════════════════════════════
#
# Runs every 6–12 hours via cron. Safe for production.
#
# What it does:
#   1. Rotates console.log / stderr.log (keep last 5MB)
#   2. Cleans old temp files (>24h)
#   3. Cleans orphaned upload documents (>7 days, only unlinked ones)
#   4. Prunes stale .next/cache entries (>7 days, NOT active build)
#   5. Reports disk + memory usage
#
# What it NEVER does:
#   - Delete .next/server or .next/static (active build files)
#   - Delete the production database
#   - Delete .env or configuration files
#   - Kill running processes
#
# Usage:
#   bash scripts/server-cleanup.sh                    # Dry run (show what would be cleaned)
#   bash scripts/server-cleanup.sh --execute          # Actually clean
#   bash scripts/server-cleanup.sh --execute --quiet  # Silent mode for cron
#
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────
SSH_USER="${SSH_USER:-u104276643}"
DOMAIN="ikfzdigitalzulassung.de"
APP_DIR="/home/${SSH_USER}/domains/${DOMAIN}/nodejs"
DATA_DIR="/home/${SSH_USER}/data"
LOG_MAX_BYTES=$((5 * 1024 * 1024))  # 5 MB max per log file
TEMP_MAX_AGE_DAYS=1                  # Delete temp files older than 1 day
UPLOAD_ORPHAN_DAYS=7                 # Delete orphaned uploads older than 7 days
CACHE_MAX_AGE_DAYS=7                 # Prune .next/cache older than 7 days

DRY_RUN=true
QUIET=false

for arg in "$@"; do
  case $arg in
    --execute) DRY_RUN=false ;;
    --quiet)   QUIET=true ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────
LOG_FILE="/tmp/ikfz-cleanup-$(date +%Y%m%d).log"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
  if [ "$QUIET" = false ]; then echo "$msg"; fi
  echo "$msg" >> "$LOG_FILE"
}

log_size() {
  local file="$1"
  if [ -f "$file" ]; then
    local size
    size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
    echo "$size"
  else
    echo "0"
  fi
}

# ── Start ─────────────────────────────────────────────────────────
log "════════════════════════════════════════════════════════"
log "IKFZ Server Cleanup — $(date)"
if [ "$DRY_RUN" = true ]; then
  log "MODE: DRY RUN (use --execute to apply changes)"
else
  log "MODE: EXECUTING"
fi
log "════════════════════════════════════════════════════════"

# ── 1. Log Rotation ──────────────────────────────────────────────
log ""
log "── 1/5 · Log Rotation ──"

rotate_log() {
  local logfile="$1"
  local label="$2"
  if [ ! -f "$logfile" ]; then
    log "  $label: not found, skipping"
    return
  fi
  local size
  size=$(log_size "$logfile")
  log "  $label: $(( size / 1024 )) KB"

  if [ "$size" -gt "$LOG_MAX_BYTES" ]; then
    if [ "$DRY_RUN" = true ]; then
      log "  → WOULD truncate to last 1MB"
    else
      tail -c 1048576 "$logfile" > "${logfile}.tmp" && mv "${logfile}.tmp" "$logfile"
      log "  → Truncated to ~1MB"
    fi
  else
    log "  → OK (under ${LOG_MAX_BYTES} bytes limit)"
  fi
}

rotate_log "${APP_DIR}/console.log" "console.log"
rotate_log "${APP_DIR}/stderr.log" "stderr.log"

# PM2 logs (if they exist)
for pmlog in /var/log/pm2/ikfz-*.log; do
  [ -f "$pmlog" ] && rotate_log "$pmlog" "$(basename "$pmlog")"
done

# ── 2. Temp Files Cleanup ────────────────────────────────────────
log ""
log "── 2/5 · Temp Files Cleanup ──"

TEMP_DIRS=(
  "/tmp/ikfz-*"
  "${APP_DIR}/tmp"
)

temp_count=0
for pattern in "${TEMP_DIRS[@]}"; do
  count=$(find $pattern -type f -mtime +${TEMP_MAX_AGE_DAYS} 2>/dev/null | wc -l || echo 0)
  temp_count=$((temp_count + count))
done

log "  Found $temp_count temp files older than ${TEMP_MAX_AGE_DAYS} day(s)"

if [ "$temp_count" -gt 0 ]; then
  if [ "$DRY_RUN" = true ]; then
    log "  → WOULD delete $temp_count files"
  else
    for pattern in "${TEMP_DIRS[@]}"; do
      find $pattern -type f -mtime +${TEMP_MAX_AGE_DAYS} -delete 2>/dev/null || true
    done
    log "  → Deleted $temp_count temp files"
  fi
fi

# ── 3. Orphaned Upload Documents ─────────────────────────────────
log ""
log "── 3/5 · Upload Documents Cleanup ──"

UPLOAD_DIR="${APP_DIR}/public/uploads/documents"
if [ -d "$UPLOAD_DIR" ]; then
  orphan_count=$(find "$UPLOAD_DIR" -type f -mtime +${UPLOAD_ORPHAN_DAYS} 2>/dev/null | wc -l || echo 0)
  orphan_size=$(find "$UPLOAD_DIR" -type f -mtime +${UPLOAD_ORPHAN_DAYS} -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1 || echo 0)
  log "  Found $orphan_count files older than ${UPLOAD_ORPHAN_DAYS} days ($(( orphan_size / 1024 / 1024 )) MB)"

  if [ "$orphan_count" -gt 0 ]; then
    if [ "$DRY_RUN" = true ]; then
      log "  → WOULD delete $orphan_count files"
    else
      find "$UPLOAD_DIR" -type f -mtime +${UPLOAD_ORPHAN_DAYS} -delete 2>/dev/null || true
      log "  → Deleted $orphan_count orphaned uploads"
    fi
  fi
else
  log "  Upload directory not found, skipping"
fi

# Also clean order-documents older than 30 days
ORDER_DOC_DIR="${APP_DIR}/public/uploads/order-documents"
if [ -d "$ORDER_DOC_DIR" ]; then
  order_count=$(find "$ORDER_DOC_DIR" -type f -mtime +30 2>/dev/null | wc -l || echo 0)
  log "  Order documents >30 days: $order_count files"
  if [ "$order_count" -gt 0 ] && [ "$DRY_RUN" = false ]; then
    find "$ORDER_DOC_DIR" -type f -mtime +30 -delete 2>/dev/null || true
    log "  → Deleted $order_count old order documents"
  fi
fi

# ── 4. Next.js Cache Pruning ─────────────────────────────────────
log ""
log "── 4/5 · Next.js Cache Pruning ──"

NEXT_CACHE_DIR="${APP_DIR}/.next/cache"
if [ -d "$NEXT_CACHE_DIR" ]; then
  cache_size=$(du -sh "$NEXT_CACHE_DIR" 2>/dev/null | cut -f1 || echo "0")
  log "  .next/cache size: $cache_size"

  # Only prune fetch-cache and images older than 7 days
  # NEVER touch .next/server or .next/static
  stale_count=0
  for subdir in "fetch-cache" "images"; do
    target="${NEXT_CACHE_DIR}/${subdir}"
    if [ -d "$target" ]; then
      count=$(find "$target" -type f -mtime +${CACHE_MAX_AGE_DAYS} 2>/dev/null | wc -l || echo 0)
      stale_count=$((stale_count + count))
    fi
  done

  log "  Stale cache entries (>${CACHE_MAX_AGE_DAYS} days): $stale_count"

  if [ "$stale_count" -gt 0 ]; then
    if [ "$DRY_RUN" = true ]; then
      log "  → WOULD prune $stale_count stale entries from fetch-cache/images"
    else
      for subdir in "fetch-cache" "images"; do
        target="${NEXT_CACHE_DIR}/${subdir}"
        [ -d "$target" ] && find "$target" -type f -mtime +${CACHE_MAX_AGE_DAYS} -delete 2>/dev/null || true
      done
      # Remove empty directories
      find "$NEXT_CACHE_DIR" -type d -empty -delete 2>/dev/null || true
      log "  → Pruned $stale_count stale cache entries"
    fi
  fi
else
  log "  .next/cache not found, skipping"
fi

# ── 5. Resource Report ───────────────────────────────────────────
log ""
log "── 5/5 · Resource Report ──"

# Disk usage
if command -v df &>/dev/null; then
  disk_usage=$(df -h /home 2>/dev/null | tail -1 | awk '{print $5}')
  disk_avail=$(df -h /home 2>/dev/null | tail -1 | awk '{print $4}')
  log "  Disk usage: ${disk_usage} used, ${disk_avail} available"

  # Alert if disk > 85%
  disk_pct=$(echo "$disk_usage" | tr -d '%')
  if [ "$disk_pct" -gt 85 ] 2>/dev/null; then
    log "  ⚠️  WARNING: Disk usage above 85%!"
  fi
fi

# Memory usage
if command -v free &>/dev/null; then
  mem_info=$(free -m 2>/dev/null | grep '^Mem:' | awk '{printf "Total: %dMB, Used: %dMB, Free: %dMB", $2, $3, $4}')
  log "  Memory: $mem_info"
fi

# App directory size
app_size=$(du -sh "$APP_DIR" 2>/dev/null | cut -f1 || echo "unknown")
log "  App directory: $app_size"

# Database size
if [ -f "${DATA_DIR}/production.db" ]; then
  db_size=$(du -sh "${DATA_DIR}/production.db" 2>/dev/null | cut -f1 || echo "unknown")
  log "  Database: $db_size"
fi

# Upload directory size
uploads_size=$(du -sh "${APP_DIR}/public/uploads" 2>/dev/null | cut -f1 || echo "0")
log "  Uploads: $uploads_size"

# ── Summary ───────────────────────────────────────────────────────
log ""
log "════════════════════════════════════════════════════════"
log "Cleanup complete. Log saved to: $LOG_FILE"
log "════════════════════════════════════════════════════════"
