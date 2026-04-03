#!/usr/bin/env node
/**
 * Production Database Backup Script
 * ==================================
 * Creates a timestamped copy of production.db.
 * Keeps last 7 backups, deletes older ones.
 *
 * Usage:
 *   node scripts/backup-db.js
 *
 * Cron (daily at 3 AM):
 *   0 3 * * * cd /path/to/app && node scripts/backup-db.js >> /var/log/db-backup.log 2>&1
 */

const fs = require('fs');
const path = require('path');

const MAX_BACKUPS = 7;

// Detect DB path
const dbPath = process.env.DB_PATH;
if (!dbPath) {
  // Auto-detect Hostinger
  const cwd = process.cwd();
  const match = cwd.match(/\/home\/(u\d+)\//);
  if (!match) {
    console.error('[BACKUP] DB_PATH not set and not on Hostinger. Nothing to back up.');
    process.exit(0);
  }
  const domainsDir = `/home/${match[1]}/domains`;
  if (!fs.existsSync(domainsDir)) {
    console.error('[BACKUP] Domains dir not found:', domainsDir);
    process.exit(1);
  }
  const domains = fs.readdirSync(domainsDir);
  let found = false;
  for (const domain of domains) {
    const candidate = path.join(domainsDir, domain, 'database', 'production.db');
    if (fs.existsSync(candidate)) {
      runBackup(candidate);
      found = true;
      break;
    }
  }
  if (!found) {
    console.error('[BACKUP] No production.db found in any domain.');
    process.exit(1);
  }
} else {
  runBackup(dbPath);
}

function runBackup(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    console.error(`[BACKUP] Source DB not found: ${sourcePath}`);
    process.exit(1);
  }

  const backupDir = path.join(path.dirname(sourcePath), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Create timestamped backup
  const now = new Date();
  const timestamp = now.toISOString().replace(/[T:]/g, '-').split('.')[0];
  const backupFile = path.join(backupDir, `production-${timestamp}.db`);

  const stats = fs.statSync(sourcePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);

  fs.copyFileSync(sourcePath, backupFile);
  console.log(`[BACKUP] ✅ Created: ${backupFile} (${sizeMB} MB)`);

  // Clean old backups — keep only MAX_BACKUPS most recent
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('production-') && f.endsWith('.db'))
    .sort()
    .reverse();

  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    for (const file of toDelete) {
      const filePath = path.join(backupDir, file);
      fs.unlinkSync(filePath);
      console.log(`[BACKUP] 🗑 Deleted old backup: ${file}`);
    }
  }

  console.log(`[BACKUP] Total backups: ${Math.min(backups.length, MAX_BACKUPS)}`);
}
