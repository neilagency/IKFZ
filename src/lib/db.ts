import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDbPath(): string {
  const srcPath = path.join(process.cwd(), 'prisma', 'dev.db');

  // On Vercel (production), copy DB to /tmp so it's writable
  if (process.env.VERCEL) {
    const tmpPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpPath)) {
      fs.copyFileSync(srcPath, tmpPath);
    }
    return tmpPath;
  }

  return srcPath;
}

function createPrismaClient() {
  const dbPath = getDbPath();
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
