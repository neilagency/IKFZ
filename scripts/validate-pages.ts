import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Get all DB pages and posts
  const dbPages = await prisma.page.findMany({ select: { slug: true, title: true, status: true, content: true }, orderBy: { slug: 'asc' } });
  const dbPosts = await prisma.post.findMany({ select: { slug: true, title: true, status: true }, orderBy: { slug: 'asc' } });
  const dbSlugs = new Set(dbPages.map(p => p.slug));
  const dbPostSlugs = new Set(dbPosts.map(p => p.slug));

  // 2. Get all WP pages and posts from audit
  const wpData = JSON.parse(fs.readFileSync('audit/wordpress-urls.json', 'utf8'));
  const wpPages = wpData.filter((x: any) => x.type === 'page');
  const wpPosts = wpData.filter((x: any) => x.type === 'post');

  console.log('=== PAGES SYNC VALIDATION ===');
  console.log(`WP Pages: ${wpPages.length}`);
  console.log(`DB Pages: ${dbPages.length}`);
  console.log();

  // 3. Find missing pages
  const missingPages = wpPages.filter((wp: any) => !dbSlugs.has(wp.slug));
  if (missingPages.length > 0) {
    console.log(`❌ MISSING PAGES (${missingPages.length}):`);
    missingPages.forEach((m: any) => console.log(`  - ${m.slug} | "${m.title}"`));
  } else {
    console.log('✅ All WP pages exist in DB');
  }
  console.log();

  // 4. Extra DB pages (not in WP)
  const wpPageSlugs = new Set(wpPages.map((p: any) => p.slug));
  const extraPages = dbPages.filter(db => !wpPageSlugs.has(db.slug));
  if (extraPages.length > 0) {
    console.log(`ℹ️ Extra DB pages not in WP (${extraPages.length}):`);
    extraPages.forEach(e => console.log(`  - ${e.slug} | "${e.title}"`));
  }
  console.log();

  // 5. Check duplicate slugs
  const slugCounts: Record<string, number> = {};
  dbPages.forEach(p => { slugCounts[p.slug] = (slugCounts[p.slug] || 0) + 1; });
  const duplicates = Object.entries(slugCounts).filter(([, c]) => c > 1);
  if (duplicates.length > 0) {
    console.log(`❌ DUPLICATE page slugs: ${JSON.stringify(duplicates)}`);
  } else {
    console.log('✅ No duplicate page slugs');
  }
  console.log();

  // 6. Check pages with empty content
  const emptyContentPages = dbPages.filter(p => !p.content || p.content.trim().length < 10);
  if (emptyContentPages.length > 0) {
    console.log(`⚠️ Pages with minimal/empty content (${emptyContentPages.length}):`);
    emptyContentPages.forEach(p => console.log(`  - ${p.slug} (${p.content?.length || 0} chars)`));
  } else {
    console.log('✅ All pages have content');
  }
  console.log();

  // 7. Check SEO coverage
  const pagesWithSeo = await prisma.page.count({ where: { seo: { isNot: null } } });
  const postsWithSeo = await prisma.post.count({ where: { seo: { isNot: null } } });
  console.log(`SEO coverage: Pages ${pagesWithSeo}/${dbPages.length}, Posts ${postsWithSeo}/${dbPosts.length}`);
  if (pagesWithSeo === dbPages.length && postsWithSeo === dbPosts.length) {
    console.log('✅ All pages and posts have SEO records');
  } else {
    console.log('❌ Some items missing SEO records');
  }
  console.log();

  // 8. Posts validation
  console.log('=== POSTS SYNC VALIDATION ===');
  console.log(`WP Posts: ${wpPosts.length}`);
  console.log(`DB Posts: ${dbPosts.length}`);
  const missingPosts = wpPosts.filter((wp: any) => !dbPostSlugs.has(wp.slug));
  if (missingPosts.length > 0) {
    console.log(`❌ MISSING POSTS (${missingPosts.length}):`);
    missingPosts.forEach((m: any) => console.log(`  - ${m.slug} | "${m.title}"`));
  } else {
    console.log('✅ All WP posts exist in DB');
  }
  console.log();

  // 9. URL consistency check
  console.log('=== URL CONSISTENCY ===');
  let urlIssues = 0;
  for (const wp of wpPages) {
    const expectedSlug = wp.slug;
    if (!dbSlugs.has(expectedSlug)) {
      urlIssues++;
    }
  }
  if (urlIssues === 0) {
    console.log('✅ All WordPress slugs match DB entries');
  } else {
    console.log(`❌ ${urlIssues} URL mismatches`);
  }

  // Summary
  console.log();
  console.log('=== SUMMARY ===');
  console.log(`Pages: ${dbPages.length} in DB / ${wpPages.length} in WP`);
  console.log(`Posts: ${dbPosts.length} in DB / ${wpPosts.length} in WP`);
  console.log(`Missing pages: ${missingPages.length}`);
  console.log(`Missing posts: ${missingPosts.length}`);
  console.log(`Duplicate slugs: ${duplicates.length}`);
  console.log(`Pages without SEO: ${dbPages.length - pagesWithSeo}`);
  console.log(`Posts without SEO: ${dbPosts.length - postsWithSeo}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
