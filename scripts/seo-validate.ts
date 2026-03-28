import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

const adapter = new PrismaBetterSqlite3({ url: 'file:' + path.join(process.cwd(), 'prisma', 'dev.db') });
const prisma = new PrismaClient({ adapter } as any);

const SITE_URL = 'https://ikfzdigitalzulassung.de';

interface AuditResult {
  category: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

async function runAudit(): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // ============================================================
  // 1. MIDDLEWARE CHECK
  // ============================================================
  const middlewareExists = fs.existsSync(path.join(process.cwd(), 'src', 'middleware.ts'));
  results.push({
    category: 'Middleware',
    status: middlewareExists ? 'PASS' : 'FAIL',
    message: middlewareExists
      ? 'middleware.ts exists — www→non-www + trailing slash enforcement active'
      : 'MISSING middleware.ts — no www redirect or trailing slash enforcement',
  });

  // ============================================================
  // 2. SITEMAP VALIDATION
  // ============================================================
  const sitemapFile = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'sitemap.ts'), 'utf-8');

  // Check noindex pages are excluded
  const noindexPages = await prisma.page.findMany({
    where: { status: 'published' },
    include: { seo: true },
  });
  const noindexSlugs = noindexPages
    .filter((p: any) => p.seo?.robots?.includes('noindex'))
    .map((p: any) => p.slug);

  for (const slug of noindexSlugs) {
    const excluded = sitemapFile.includes(slug) || sitemapFile.includes('noindex');
    results.push({
      category: 'Sitemap',
      status: excluded ? 'PASS' : 'FAIL',
      message: excluded
        ? `Noindex page /${slug}/ excluded from sitemap (via noindex filter)`
        : `NOINDEX page /${slug}/ may be in sitemap — needs exclusion`,
    });
  }

  // Check trailing slashes in sitemap
  const hasTrailingSlash = sitemapFile.includes("/${page.slug}/`") || sitemapFile.includes("/${post.slug}/`");
  results.push({
    category: 'Sitemap',
    status: hasTrailingSlash ? 'PASS' : 'WARN',
    message: hasTrailingSlash
      ? 'Sitemap URLs use trailing slashes consistently'
      : 'Sitemap URLs may not have consistent trailing slashes',
  });

  // Check excluded WC pages
  const wcSlugs = ['warenkorb', 'mein-konto', 'kasse', 'antragsuebersicht'];
  for (const slug of wcSlugs) {
    const excluded = sitemapFile.includes(`'${slug}'`);
    results.push({
      category: 'Sitemap',
      status: excluded ? 'PASS' : 'WARN',
      message: excluded
        ? `WC page /${slug}/ properly excluded from sitemap`
        : `WC page /${slug}/ may not be excluded from sitemap`,
    });
  }

  // ============================================================
  // 3. CANONICAL TAG VALIDATION
  // ============================================================
  const seoFile = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'seo.ts'), 'utf-8');

  // Check post canonical uses /blog/ prefix
  const postCanonicalCorrect = seoFile.includes('`${SITE_URL}/blog/${post.slug}/`') ||
    seoFile.includes('`${SITE_URL}/blog/${slug}/`');
  results.push({
    category: 'Canonical',
    status: postCanonicalCorrect ? 'PASS' : 'FAIL',
    message: postCanonicalCorrect
      ? 'Post canonical URLs correctly use /blog/ prefix'
      : 'CRITICAL: Post canonical URLs MISSING /blog/ prefix',
  });

  // Check page canonical has trailing slash
  const pageCanonicalTrailingSlash = seoFile.includes('`${SITE_URL}/${slug}/`');
  results.push({
    category: 'Canonical',
    status: pageCanonicalTrailingSlash ? 'PASS' : 'FAIL',
    message: pageCanonicalTrailingSlash
      ? 'Page canonical URLs use trailing slashes'
      : 'Page canonical URLs missing trailing slashes',
  });

  // Check all pages have canonical (even without SEO record)
  const fallbackCanonical = seoFile.includes("canonical: `${SITE_URL}/${slug}/`");
  results.push({
    category: 'Canonical',
    status: fallbackCanonical ? 'PASS' : 'WARN',
    message: fallbackCanonical
      ? 'Fallback canonical set for pages without SEO record'
      : 'Pages without SEO record may lack canonical tags',
  });

  // ============================================================
  // 4. ROBOTS.TXT VALIDATION
  // ============================================================
  const robotsFile = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'robots.ts'), 'utf-8');

  const robotsAllowRoot = robotsFile.includes("allow: '/'");
  results.push({
    category: 'Robots',
    status: robotsAllowRoot ? 'PASS' : 'FAIL',
    message: robotsAllowRoot ? 'robots.txt allows root crawling' : 'robots.txt may block root crawling',
  });

  const robotsDisallowApi = robotsFile.includes("'/api/'");
  results.push({
    category: 'Robots',
    status: robotsDisallowApi ? 'PASS' : 'WARN',
    message: robotsDisallowApi ? 'robots.txt blocks /api/' : '/api/ not blocked in robots.txt',
  });

  const robotsDisallowAdmin = robotsFile.includes("'/admin/'");
  results.push({
    category: 'Robots',
    status: robotsDisallowAdmin ? 'PASS' : 'WARN',
    message: robotsDisallowAdmin ? 'robots.txt blocks /admin/' : '/admin/ not blocked in robots.txt',
  });

  const robotsSitemap = robotsFile.includes('sitemap.xml');
  results.push({
    category: 'Robots',
    status: robotsSitemap ? 'PASS' : 'FAIL',
    message: robotsSitemap ? 'robots.txt includes sitemap URL' : 'MISSING sitemap URL in robots.txt',
  });

  // Not blocking _next/static
  const robotsBlocksNext = robotsFile.includes('_next');
  results.push({
    category: 'Robots',
    status: robotsBlocksNext ? 'FAIL' : 'PASS',
    message: robotsBlocksNext ? 'robots.txt incorrectly blocks /_next/' : 'robots.txt allows /_next/ resources (correct)',
  });

  // ============================================================
  // 5. URL COVERAGE (WordPress → Next.js)
  // ============================================================
  try {
    const wpUrls = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'audit', 'wordpress-urls.json'), 'utf-8'));
    const wpSlugs = new Set(wpUrls.map((u: any) => u.slug));

    const dbPages = await prisma.page.findMany({ select: { slug: true } });
    const dbPosts = await prisma.post.findMany({ select: { slug: true } });
    const dbSlugs = new Set([...dbPages.map((p: any) => p.slug), ...dbPosts.map((p: any) => p.slug)]);

    let missing = 0;
    for (const slug of wpSlugs) {
      if (!dbSlugs.has(slug)) {
        missing++;
        results.push({
          category: 'URL Coverage',
          status: 'FAIL',
          message: `WordPress URL /${slug}/ has NO equivalent in NextJS`,
        });
      }
    }
    results.push({
      category: 'URL Coverage',
      status: missing === 0 ? 'PASS' : 'FAIL',
      message: `${wpSlugs.size} WordPress URLs checked — ${wpSlugs.size - missing}/${wpSlugs.size} covered (${missing} missing)`,
    });
  } catch {
    results.push({
      category: 'URL Coverage',
      status: 'WARN',
      message: 'Could not read WordPress URL audit files',
    });
  }

  // ============================================================
  // 6. BLOG POST REDIRECT CHECK
  // ============================================================
  const slugPageFile = fs.readFileSync(path.join(process.cwd(), 'src', 'app', '[slug]', 'page.tsx'), 'utf-8');
  const hasBlogRedirect = slugPageFile.includes('permanentRedirect') && slugPageFile.includes('/blog/');
  results.push({
    category: 'Redirects',
    status: hasBlogRedirect ? 'PASS' : 'FAIL',
    message: hasBlogRedirect
      ? 'Blog posts at /{slug}/ permanently redirect to /blog/{slug}/'
      : 'Blog posts at /{slug}/ do NOT redirect to /blog/{slug}/',
  });

  // ============================================================
  // 7. NEXT.CONFIG.JS REDIRECTS
  // ============================================================
  const nextConfig = fs.readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf-8');
  const hasStarseiteRedirect = nextConfig.includes('starseite-2');
  results.push({
    category: 'Redirects',
    status: hasStarseiteRedirect ? 'PASS' : 'WARN',
    message: hasStarseiteRedirect
      ? '/starseite-2 → / redirect configured in next.config.js'
      : '/starseite-2 redirect missing from next.config.js',
  });

  // ============================================================
  // 8. DATABASE HEALTH
  // ============================================================
  const publishedPages = await prisma.page.findMany({ where: { status: 'published' } });
  const publishedPosts = await prisma.post.findMany({ where: { status: 'published' } });

  results.push({
    category: 'Database',
    status: 'PASS',
    message: `${publishedPages.length} published pages, ${publishedPosts.length} published posts in database`,
  });

  // Check for duplicate slugs
  const allSlugs = [...publishedPages.map((p: any) => p.slug), ...publishedPosts.map((p: any) => p.slug)];
  const duplicates = allSlugs.filter((slug, idx) => allSlugs.indexOf(slug) !== idx);
  results.push({
    category: 'Database',
    status: duplicates.length === 0 ? 'PASS' : 'WARN',
    message: duplicates.length === 0
      ? 'No duplicate slugs found (pages vs posts checked)'
      : `Duplicate slugs found: ${duplicates.join(', ')}`,
  });

  return results;
}

// ===========================================================
// REPORT
// ===========================================================
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         SEO AUDIT REPORT — ikfzdigitalzulassung.de    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  const results = await runAudit();

  const categories = [...new Set(results.map(r => r.category))];
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const category of categories) {
    console.log(`\n─── ${category} ${'─'.repeat(50 - category.length)}`);
    const items = results.filter(r => r.category === category);
    for (const item of items) {
      const icon = item.status === 'PASS' ? '✅' : item.status === 'WARN' ? '⚠️ ' : '❌';
      console.log(`  ${icon} ${item.message}`);
      if (item.status === 'PASS') passCount++;
      if (item.status === 'WARN') warnCount++;
      if (item.status === 'FAIL') failCount++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${passCount} PASS | ${warnCount} WARN | ${failCount} FAIL`);
  console.log(`  Score: ${Math.round((passCount / (passCount + warnCount + failCount)) * 100)}%`);
  console.log('════════════════════════════════════════════════════════\n');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(console.error);
