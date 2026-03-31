import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function run() {
  // Fix city page types - landkreis-* pages
  const landkreis = await prisma.page.updateMany({
    where: { slug: { startsWith: 'landkreis-' }, pageType: 'generic' },
    data: { pageType: 'city' },
  });
  console.log('Fixed', landkreis.count, 'landkreis pages to city type');

  // Fix city page types - auto-online-anmelden-oder-abmelden-* pages
  const autoPages = await prisma.page.updateMany({
    where: { slug: { startsWith: 'auto-online-anmelden-oder-abmelden-' }, pageType: 'generic' },
    data: { pageType: 'city' },
  });
  console.log('Fixed', autoPages.count, 'auto-online-anmelden-oder-abmelden pages to city type');

  // Fix city page types - in-* pages (like in-baden-baden)
  const inPages = await prisma.page.updateMany({
    where: { slug: { startsWith: 'in-' }, pageType: 'generic' },
    data: { pageType: 'city' },
  });
  console.log('Fixed', inPages.count, 'in-* pages to city type');

  await prisma.$disconnect();
}
run();
