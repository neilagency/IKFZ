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

// 3. Write DB_PATH to .env.local (build-time) AND .env (runtime)
// Next.js standalone runs from a DIFFERENT directory than the build.
// .env.local is read at build time, .env is copied to the runtime dir.
const dbPathLine = `DB_PATH=${dbFile}`;

for (const envFile of ['.env.local', '.env']) {
  const envPath = path.join(cwd, envFile);
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }
  // Remove any existing DB_PATH line, then append
  envContent = envContent.replace(/^DB_PATH=.*\n?/gm, '').trim();
  envContent += `\n${dbPathLine}\n`;
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`[DB-SETUP] ✅ Wrote DB_PATH to ${envFile}`);
}

// 4. Run schema migrations (add missing columns/indexes)
try {
  const Database = require('better-sqlite3');
  const db = new Database(dbFile);

  const addCol = (table, col, type, def) => {
    const cols = db.pragma(`table_info(${table})`).map(c => c.name);
    if (!cols.includes(col)) {
      const defaultClause = def !== undefined ? ` DEFAULT ${typeof def === 'string' ? `'${def}'` : def}` : '';
      db.exec(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type}${defaultClause}`);
      console.log(`[DB-SETUP] ✅ Added ${table}.${col}`);
    }
  };

  // Invoice enrichment
  addCol('Invoice', 'customerId', 'TEXT', undefined);
  addCol('Invoice', 'billingCity', 'TEXT', '');
  addCol('Invoice', 'billingPostcode', 'TEXT', '');
  addCol('Invoice', 'billingCountry', 'TEXT', 'DE');
  addCol('Invoice', 'companyName', 'TEXT', '');
  addCol('Invoice', 'companyTaxId', 'TEXT', '');
  addCol('Invoice', 'subtotal', 'REAL', 0);
  addCol('Invoice', 'taxRate', 'REAL', 19);
  addCol('Invoice', 'taxAmount', 'REAL', 0);
  addCol('Invoice', 'paymentMethod', 'TEXT', '');
  addCol('Invoice', 'transactionId', 'TEXT', '');
  addCol('Invoice', 'pdfUrl', 'TEXT', '');
  addCol('Invoice', 'updatedAt', 'TEXT', undefined);

  const createIdx = (name, table, cols) => {
    try { db.exec(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}"(${cols})`); } catch (e) { /* ignore */ }
  };

  createIdx('idx_order_status', 'Order', '"status"');
  createIdx('idx_order_billing_email', 'Order', '"billingEmail"');
  createIdx('idx_order_created_at', 'Order', '"createdAt"');
  createIdx('idx_order_deleted_at', 'Order', '"deletedAt"');
  createIdx('idx_order_deleted_status', 'Order', '"deletedAt","status"');
  createIdx('idx_order_deleted_created', 'Order', '"deletedAt","createdAt"');

  createIdx('idx_invoice_customer_id', 'Invoice', '"customerId"');
  createIdx('idx_invoice_issued_at', 'Invoice', '"issuedAt"');
  createIdx('idx_invoice_status', 'Invoice', '"status"');
  createIdx('idx_invoice_billing_email', 'Invoice', '"billingEmail"');
  createIdx('idx_invoice_created_at', 'Invoice', '"createdAt"');

  db.close();
  console.log('[DB-SETUP] ✅ Schema migration complete');
} catch (migErr) {
  console.log('[DB-SETUP] ⚠ Schema migration skipped:', migErr.message);
}

console.log('[DB-SETUP] ════════════════════════════════════════');
