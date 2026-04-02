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

  // 4. Check prisma
  try {
    const { default: prisma } = await import('@/lib/db');
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok');
    checks['PRISMA'] = `connected OK (result: ${JSON.stringify(result)})`;
  } catch (e: any) {
    checks['PRISMA'] = `FAILED: ${e.message}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
