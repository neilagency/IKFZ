import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Server monitoring endpoint — reports memory, disk, uptime, and app metrics.
 * GET /api/admin/monitor
 * Protected by admin cookie check in middleware.
 */
export async function GET() {
  const report: Record<string, unknown> = {};

  // 1. Memory usage (Node.js process)
  const mem = process.memoryUsage();
  report.memory = {
    rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    external: `${Math.round(mem.external / 1024 / 1024)} MB`,
  };

  // 2. Memory warning (300MB = PM2 restart threshold on shared hosting)
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  report.memoryWarning = rssMB > 300 ? `⚠️ High memory: ${rssMB}MB (PM2 limit: 300MB)` : null;

  // 3. Uptime
  report.uptime = `${Math.round(process.uptime() / 60)} minutes`;

  // 3b. Environment safety check
  report.nodeEnv = process.env.NODE_ENV;
  if (process.env.NODE_ENV !== 'production') {
    report.envWarning = `🚨 NOT running in production mode! NODE_ENV=${process.env.NODE_ENV}`;
  }

  // 4. Disk usage (safe for shared hosting)
  try {
    const df = execSync('df -h /home 2>/dev/null | tail -1', { timeout: 5000 }).toString().trim();
    const parts = df.split(/\s+/);
    report.disk = {
      total: parts[1] || 'unknown',
      used: parts[2] || 'unknown',
      available: parts[3] || 'unknown',
      usagePercent: parts[4] || 'unknown',
    };

    const pct = parseInt(parts[4] || '0');
    report.diskWarning = pct > 85 ? `⚠️ Disk usage at ${pct}%!` : null;
  } catch {
    report.disk = 'unable to check';
  }

  // 5. App directory sizes
  try {
    const appDir = process.cwd();
    const sizes: Record<string, string> = {};

    const checkDir = (dir: string, label: string) => {
      const fullPath = path.join(appDir, dir);
      if (fs.existsSync(fullPath)) {
        try {
          const result = execSync(`du -sh "${fullPath}" 2>/dev/null | cut -f1`, { timeout: 5000 }).toString().trim();
          sizes[label] = result;
        } catch {
          sizes[label] = 'error';
        }
      }
    };

    checkDir('.next', '.next build');
    checkDir('.next/cache', '.next/cache');
    checkDir('public/uploads', 'uploads');
    checkDir('public/uploads/documents', 'upload documents');

    report.directorySizes = sizes;
  } catch {
    report.directorySizes = 'unable to check';
  }

  // 6. Database size
  try {
    const dbPath = process.env.DB_PATH;
    if (dbPath && fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      report.database = {
        path: dbPath,
        size: `${(stat.size / 1024 / 1024).toFixed(1)} MB`,
        lastModified: stat.mtime.toISOString(),
      };
    }
  } catch {
    report.database = 'unable to check';
  }

  // 7. Log file sizes
  try {
    const logFiles: Record<string, string> = {};
    const checkLog = (filePath: string, label: string) => {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        logFiles[label] = `${(stat.size / 1024).toFixed(0)} KB`;
      }
    };

    const appDir = process.cwd();
    checkLog(path.join(appDir, 'console.log'), 'console.log');
    checkLog(path.join(appDir, 'stderr.log'), 'stderr.log');

    report.logFiles = logFiles;
  } catch {
    report.logFiles = 'unable to check';
  }

  // 8. Node.js info
  report.node = {
    version: process.version,
    pid: process.pid,
    platform: process.platform,
    arch: process.arch,
  };

  // 9. Build ID
  try {
    const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');
    if (fs.existsSync(buildIdPath)) {
      report.buildId = fs.readFileSync(buildIdPath, 'utf-8').trim();
    }
  } catch {
    // skip
  }

  // 10. Timestamp
  report.timestamp = new Date().toISOString();

  return NextResponse.json(report);
}
