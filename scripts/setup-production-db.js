/**
 * Production Database Setup Script
 * =================================
 * Runs BEFORE `next build` to ensure DB_PATH points to a persistent
 * production database that survives redeploys.
 *
 * On Hostinger Git Auto Deploy:
 *   CWD = /home/u.../domains/.../public_html/.builds/source/repository
 *   → DB lives at /home/u.../domains/.../database/production.db
 *   → This path is OUTSIDE the git-managed directory
 *
 * On VPS (PM2 + deploy.sh):
 *   deploy.sh already sets DB_PATH — this script is a no-op.
 *
 * Locally (development):
 *   Not on Hostinger/VPS — skipped. Uses prisma/dev.db via db.ts fallback.
 */

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

// ── Detect environment ──

// Already have DB_PATH set (VPS, manual config, etc.)
if (process.env.DB_PATH) {
  console.log('[DB-SETUP] DB_PATH already set:', process.env.DB_PATH);
  if (!fs.existsSync(process.env.DB_PATH)) {
    console.error('[DB-SETUP] ⚠ WARNING: DB_PATH file does not exist yet:', process.env.DB_PATH);
  }
  process.exit(0);
}

// Detect Hostinger auto-deploy by path pattern
const hostingerMatch = cwd.match(/^(\/home\/u\d+\/domains\/[^/]+)/);
if (!hostingerMatch) {
  console.log('[DB-SETUP] Not on Hostinger — skipping (local development)');
  process.exit(0);
}

// ── Hostinger Auto-Deploy Setup ──

const domainDir = hostingerMatch[1];
const dbDir = path.join(domainDir, 'database');
const dbFile = path.join(dbDir, 'production.db');
const seedDb = path.join(cwd, 'prisma', 'dev.db');

console.log('[DB-SETUP] ════════════════════════════════════════');
console.log('[DB-SETUP] Hostinger auto-deploy detected');
console.log('[DB-SETUP] Domain dir:', domainDir);
console.log('[DB-SETUP] Persistent DB:', dbFile);

// 1. Create persistent directory
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('[DB-SETUP] Created database directory:', dbDir);
}

// 2. First deploy: copy seed database
if (!fs.existsSync(dbFile)) {
  if (fs.existsSync(seedDb)) {
    fs.copyFileSync(seedDb, dbFile);
    console.log('[DB-SETUP] ✅ First deploy — copied seed database to:', dbFile);
  } else {
    console.error('[DB-SETUP] ❌ FATAL: No seed database at', seedDb);
    console.error('[DB-SETUP] Cannot initialize production. Upload a database manually.');
    process.exit(1);
  }
} else {
  const stats = fs.statSync(dbFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
  console.log(`[DB-SETUP] ✅ Production DB exists (${sizeMB} MB) — NOT overwriting`);
}

// 3. Write DB_PATH to .env.local so next build and runtime pick it up
const envLocalPath = path.join(cwd, '.env.local');
let envContent = '';
if (fs.existsSync(envLocalPath)) {
  envContent = fs.readFileSync(envLocalPath, 'utf-8');
}

// Remove any existing DB_PATH line
envContent = envContent.replace(/^DB_PATH=.*\n?/gm, '').trim();
envContent += `\nDB_PATH=${dbFile}\n`;
fs.writeFileSync(envLocalPath, envContent.trim() + '\n');

console.log('[DB-SETUP] ✅ Wrote DB_PATH to .env.local');
console.log('[DB-SETUP] ════════════════════════════════════════');
