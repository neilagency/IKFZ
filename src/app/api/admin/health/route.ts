import { NextRequest, NextResponse } from 'next/server';

// Diagnostic endpoint — dynamic imports only, never crashes at module level
export async function GET(req: NextRequest) {
  const checks: Record<string, string> = {};

  // 1. Environment
  checks['NODE_ENV'] = process.env.NODE_ENV || '(not set)';
  checks['DB_PATH'] = process.env.DB_PATH || '(not set)';
  checks['CWD'] = process.cwd();

  // 2. Check if DB file exists
  try {
    const fs = await import('fs');
    const path = await import('path');

    if (process.env.DB_PATH) {
      checks['DB_FILE_EXISTS'] = fs.existsSync(process.env.DB_PATH) ? 'YES' : 'NO';
    } else {
      const prodPath = path.join(process.cwd(), 'prisma', 'production.db');
      const devPath = path.join(process.cwd(), 'prisma', 'dev.db');
      checks['PROD_DB_EXISTS'] = fs.existsSync(prodPath) ? `YES (${prodPath})` : `NO (${prodPath})`;
      checks['DEV_DB_EXISTS'] = fs.existsSync(devPath) ? `YES (${devPath})` : `NO (${devPath})`;
    }
  } catch (e: any) {
    checks['FS_ERROR'] = e.message;
  }

  // 3. Check better-sqlite3 native module
  try {
    const bs3 = await import('better-sqlite3');
    checks['BETTER_SQLITE3'] = 'loaded OK';
  } catch (e: any) {
    checks['BETTER_SQLITE3'] = `FAILED: ${e.message}`;
  }

  // 4. Check prisma with regular query (not raw — avoids BigInt issue)
  try {
    const { default: prisma } = await import('@/lib/db');
    const product = await prisma.product.findFirst({ select: { id: true, slug: true, price: true } });
    checks['PRISMA'] = product ? `OK (found: ${product.slug}, price=${product.price})` : 'OK (no products)';
  } catch (e: any) {
    checks['PRISMA'] = `FAILED: ${e.message}`;
    checks['PRISMA_STACK'] = (e.stack || '').split('\n').slice(0, 5).join(' | ');
  }

  // 5. Test the exact query the homepage uses
  try {
    const { getProductBySlug } = await import('@/lib/db');
    const p = await getProductBySlug('auto-online-anmelden');
    checks['HOMEPAGE_QUERY'] = p ? `OK (${p.slug}, price=${p.price})` : 'OK (product not found)';
  } catch (e: any) {
    checks['HOMEPAGE_QUERY'] = `FAILED: ${e.message}`;
  }

  // 6. Node version
  checks['NODE_VERSION'] = process.version;

  return NextResponse.json(checks, { status: 200 });
}
