import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// POST /api/admin/backup — trigger a DB backup (protected by CRON_SECRET or admin cookie)
export async function POST(req: NextRequest) {
  // Verify: either CRON_SECRET header or admin cookie
  const cronSecret = req.headers.get('x-cron-secret');
  const adminToken = req.cookies.get('admin_token')?.value;

  if (!adminToken && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { default: prisma } = await import('@/lib/db');
    // Get the actual DB path by querying pragma
    const dbPathResult = await prisma.$queryRawUnsafe('PRAGMA database_list') as any[];
    const dbFile = dbPathResult?.[0]?.file;

    if (!dbFile || !fs.existsSync(dbFile)) {
      return NextResponse.json({ error: 'DB file not found', dbFile }, { status: 500 });
    }

    const backupDir = path.join(path.dirname(dbFile), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[T:]/g, '-').split('.')[0];
    const backupFile = path.join(backupDir, `production-${timestamp}.db`);

    fs.copyFileSync(dbFile, backupFile);

    // Clean old backups (keep 7)
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('production-') && f.endsWith('.db'))
      .sort().reverse();
    const deleted: string[] = [];
    for (const old of backups.slice(7)) {
      fs.unlinkSync(path.join(backupDir, old));
      deleted.push(old);
    }

    const sizeMB = (fs.statSync(backupFile).size / (1024 * 1024)).toFixed(1);

    return NextResponse.json({
      success: true,
      backup: backupFile,
      sizeMB,
      totalBackups: Math.min(backups.length, 7),
      deleted,
    });
  } catch (error) {
    console.error('[BACKUP]', error);
    return NextResponse.json(
      { error: 'Backup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
