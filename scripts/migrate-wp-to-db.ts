/**
 * WordPress to SQLite Database Migration Script
 * 
 * Fetches ALL content from WordPress REST API including:
 * - 46 pages with full content
 * - 33 blog posts with full content
 * - Categories and tags
 * - SEO metadata (scraped from RankMath <head> tags)
 * - Schema.org JSON-LD structured data
 * 
 * Then seeds everything into the local Prisma/SQLite database.
 * 
 * Usage: npx tsx scripts/migrate-wp-to-db.ts
 */

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const WP_API_BASE = 'https://ikfzdigitalzulassung.de/wp-json/wp/v2';
const SITE_URL = 'https://ikfzdigitalzulassung.de';

const dbPath = path.join(new URL('.', import.meta.url).pathname, '..', 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:' + dbPath });
const prisma = new PrismaClient({ adapter });

// ─── Types ──────────────────────────────────────────────────

interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  link: string;
  parent: number;
  menu_order: number;
  featured_media: number;
  status: string;
}

interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  link: string;
  categories: number[];
  tags: number[];
  featured_media: number;
  status: string;
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

interface WPTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDesc?: string;
  twitterImage?: string;
  robots?: string;
  schemaJson?: string;
}

// ─── Helpers ────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function fetchAllFromWP<T>(endpoint: string): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${WP_API_BASE}/${endpoint}?per_page=100&page=${page}`;
    console.log(`  📥 ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 400) break;
        console.warn(`  ⚠️ HTTP ${response.status}`);
        break;
      }
      const data = (await response.json()) as T[];
      allItems.push(...data);
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      break;
    }
  }

  return allItems;
}

async function scrapeSEO(url: string): Promise<SEOData> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Migrator/1.0)' },
    });
    if (!response.ok) return {};
    const html = await response.text();
    
    const extract = (pattern: RegExp): string | undefined => {
      const match = html.match(pattern);
      return match?.[1]?.trim();
    };

    // Extract meta tags
    const metaTitle = extract(/<title[^>]*>([^<]+)<\/title>/);
    const metaDescription = extract(/<meta\s+name="description"\s+content="([^"]*)"/);
    const canonicalUrl = extract(/<link\s+rel="canonical"\s+href="([^"]*)"/);
    const ogTitle = extract(/<meta\s+property="og:title"\s+content="([^"]*)"\s*\/?>/);
    const ogDescription = extract(/<meta\s+property="og:description"\s+content="([^"]*)"\s*\/?>/);
    const ogImage = extract(/<meta\s+property="og:image"\s+content="([^"]*)"\s*\/?>/);
    const ogType = extract(/<meta\s+property="og:type"\s+content="([^"]*)"\s*\/?>/);
    const twitterCard = extract(/<meta\s+name="twitter:card"\s+content="([^"]*)"/);
    const twitterTitle = extract(/<meta\s+name="twitter:title"\s+content="([^"]*)"/);
    const twitterDesc = extract(/<meta\s+name="twitter:description"\s+content="([^"]*)"/);
    const twitterImage = extract(/<meta\s+name="twitter:image"\s+content="([^"]*)"/);
    const robots = extract(/<meta\s+name="robots"\s+content="([^"]*)"/);

    // Extract RankMath JSON-LD schema
    const schemaMatch = html.match(/<script\s+type="application\/ld\+json"\s+class="rank-math-schema">([\s\S]*?)<\/script>/);
    const schemaJson = schemaMatch?.[1]?.trim();

    return {
      metaTitle,
      metaDescription,
      canonicalUrl,
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      twitterCard,
      twitterTitle,
      twitterDesc,
      twitterImage,
      robots,
      schemaJson,
    };
  } catch (error) {
    console.warn(`  ⚠️ Could not scrape SEO for ${url}:`, error);
    return {};
  }
}

function classifyPage(slug: string): string {
  const cityPatterns = [
    'kfz-zulassung-', 'zulassungsstelle-', 'autoanmeldung-',
    'auto-anmelden-', 'kfz-zulassung-in-',
  ];
  if (cityPatterns.some(p => slug.startsWith(p))) return 'city';
  
  const legalPages = ['impressum', 'datenschutzerklarung', 'agb'];
  if (legalPages.includes(slug)) return 'legal';
  
  const servicePages = ['kfz-services', 'kfz-service', 'kfz-online-service', 'evb',
    'kennzeichen-bestellen', 'kfz-online-abmelden', 'auto-online-anmelden',
    'motorrad-online-anmelden', 'auto-verkaufen', 'kfz-versicherung-berechnen',
    'motorrad-versicherung-vergleichen', 'bezahlmoeglichkeiten'];
  if (servicePages.includes(slug)) return 'service';

  const landingPages = ['starseite-2', 'startseite', 'kfz-zulassung-in-deiner-stadt'];
  if (landingPages.includes(slug)) return 'landing';

  return 'generic';
}

function estimateReadingTime(content: string): number {
  const words = stripHtml(content).split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── Main Migration ─────────────────────────────────────────

async function main() {
  console.log('🚀 Starting WordPress → SQLite Database Migration\n');
  console.log('═'.repeat(60));

  // Step 1: Fetch all WP data
  console.log('\n📄 Step 1: Fetching WordPress Pages...');
  const wpPages = await fetchAllFromWP<WPPage>('pages');
  console.log(`   ✅ ${wpPages.length} pages fetched`);

  console.log('\n📝 Step 2: Fetching WordPress Posts...');
  const wpPosts = await fetchAllFromWP<WPPost>('posts');
  console.log(`   ✅ ${wpPosts.length} posts fetched`);

  console.log('\n📂 Step 3: Fetching Categories...');
  const wpCategories = await fetchAllFromWP<WPCategory>('categories');
  console.log(`   ✅ ${wpCategories.length} categories fetched`);

  console.log('\n🏷️  Step 4: Fetching Tags...');
  const wpTags = await fetchAllFromWP<WPTag>('tags');
  console.log(`   ✅ ${wpTags.length} tags fetched`);

  // Step 2: Clear existing data
  console.log('\n🗑️  Step 5: Clearing existing database...');
  await prisma.sEO.deleteMany();
  await prisma.postCategory.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.post.deleteMany();
  await prisma.page.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  console.log('   ✅ Database cleared');

  // Step 3: Seed Categories
  console.log('\n📂 Step 6: Seeding Categories...');
  const categoryMap = new Map<number, string>();
  for (const cat of wpCategories) {
    if (cat.slug === 'uncategorized' || cat.slug === 'allgemein') continue;
    const created = await prisma.category.create({
      data: {
        name: stripHtml(cat.name),
        slug: cat.slug,
        description: cat.description || null,
      },
    });
    categoryMap.set(cat.id, created.id);
    console.log(`   📁 ${cat.name} (${cat.count} posts)`);
  }
  console.log(`   ✅ ${categoryMap.size} categories seeded`);

  // Step 4: Seed Tags
  console.log('\n🏷️  Step 7: Seeding Tags...');
  const tagMap = new Map<number, string>();
  for (const tag of wpTags) {
    const created = await prisma.tag.create({
      data: {
        name: stripHtml(tag.name),
        slug: tag.slug,
      },
    });
    tagMap.set(tag.id, created.id);
    console.log(`   🏷️  ${tag.name}`);
  }
  console.log(`   ✅ ${tagMap.size} tags seeded`);

  // Step 5: Seed Pages + SEO
  console.log('\n📄 Step 8: Seeding Pages with SEO...');
  let pageCount = 0;
  for (const wp of wpPages) {
    if (wp.status !== 'publish') continue;
    
    const title = stripHtml(wp.title.rendered);
    const pageType = classifyPage(wp.slug);
    const pageUrl = wp.link;

    console.log(`   📄 [${pageType.toUpperCase().padEnd(8)}] ${wp.slug}`);

    // Scrape SEO
    console.log(`      🔍 Scraping SEO from ${pageUrl}`);
    const seo = await scrapeSEO(pageUrl);

    const page = await prisma.page.create({
      data: {
        wpId: wp.id,
        slug: wp.slug,
        title: title,
        content: wp.content.rendered,
        excerpt: wp.excerpt?.rendered ? stripHtml(wp.excerpt.rendered) : null,
        status: 'published',
        menuOrder: wp.menu_order || 0,
        pageType: pageType,
        parentSlug: null,
        publishedAt: new Date(wp.date),
        seo: {
          create: {
            metaTitle: seo.metaTitle || title,
            metaDescription: seo.metaDescription || null,
            canonicalUrl: seo.canonicalUrl || pageUrl,
            ogTitle: seo.ogTitle || title,
            ogDescription: seo.ogDescription || seo.metaDescription || null,
            ogImage: seo.ogImage || null,
            ogType: seo.ogType || 'website',
            twitterCard: seo.twitterCard || 'summary_large_image',
            twitterTitle: seo.twitterTitle || title,
            twitterDesc: seo.twitterDesc || seo.metaDescription || null,
            twitterImage: seo.twitterImage || seo.ogImage || null,
            robots: seo.robots || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large',
            schemaJson: seo.schemaJson || null,
          },
        },
      },
    });
    pageCount++;

    // Rate limit: don't hammer WP server
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`   ✅ ${pageCount} pages seeded with SEO`);

  // Step 6: Seed Posts + SEO + Categories + Tags
  console.log('\n📝 Step 9: Seeding Blog Posts with SEO...');
  let postCount = 0;
  for (const wp of wpPosts) {
    if (wp.status !== 'publish') continue;

    const title = stripHtml(wp.title.rendered);
    const postUrl = wp.link;

    console.log(`   📝 ${wp.slug}`);
    console.log(`      🔍 Scraping SEO from ${postUrl}`);
    const seo = await scrapeSEO(postUrl);

    const post = await prisma.post.create({
      data: {
        wpId: wp.id,
        slug: wp.slug,
        title: title,
        content: wp.content.rendered,
        excerpt: wp.excerpt?.rendered ? stripHtml(wp.excerpt.rendered) : null,
        status: 'published',
        author: 'iKFZ-Team',
        readingTime: estimateReadingTime(wp.content.rendered),
        publishedAt: new Date(wp.date),
        seo: {
          create: {
            metaTitle: seo.metaTitle || title,
            metaDescription: seo.metaDescription || null,
            canonicalUrl: seo.canonicalUrl || postUrl,
            ogTitle: seo.ogTitle || title,
            ogDescription: seo.ogDescription || seo.metaDescription || null,
            ogImage: seo.ogImage || null,
            ogType: seo.ogType || 'article',
            twitterCard: seo.twitterCard || 'summary_large_image',
            twitterTitle: seo.twitterTitle || title,
            twitterDesc: seo.twitterDesc || seo.metaDescription || null,
            twitterImage: seo.twitterImage || seo.ogImage || null,
            robots: seo.robots || 'follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large',
            schemaJson: seo.schemaJson || null,
          },
        },
      },
    });

    // Link categories
    for (const catId of wp.categories) {
      const dbCatId = categoryMap.get(catId);
      if (dbCatId) {
        await prisma.postCategory.create({
          data: { postId: post.id, categoryId: dbCatId },
        });
      }
    }

    // Link tags
    for (const tagId of wp.tags) {
      const dbTagId = tagMap.get(tagId);
      if (dbTagId) {
        await prisma.postTag.create({
          data: { postId: post.id, tagId: dbTagId },
        });
      }
    }

    postCount++;
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(`   ✅ ${postCount} posts seeded with SEO`);

  // Step 7: Create default admin user
  console.log('\n👤 Step 10: Creating admin user...');
  const bcrypt = await import('bcryptjs');
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@ikfzdigitalzulassung.de' } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash('ikfz2024!admin', 12);
    await prisma.user.create({
      data: {
        email: 'admin@ikfzdigitalzulassung.de',
        passwordHash: hash,
        name: 'Admin',
        role: 'admin',
      },
    });
    console.log('   ✅ Admin user created (admin@ikfzdigitalzulassung.de)');
  } else {
    console.log('   ℹ️  Admin user already exists');
  }

  // Step 8: Seed site settings
  console.log('\n⚙️  Step 11: Seeding site settings...');
  const settings = [
    { key: 'site_name', value: 'ikfzdigitalzulassung.de' },
    { key: 'site_description', value: 'KFZ Zulassung online – sofort losfahren oder online abmelden' },
    { key: 'site_url', value: 'https://ikfzdigitalzulassung.de' },
    { key: 'company_name', value: 'iKFZ Digital Zulassung' },
    { key: 'company_address', value: JSON.stringify({ street: 'Gerhard-Küchen-Strasse 14', city: 'Essen', region: 'NRW', zip: '45141' }) },
    { key: 'company_email', value: 'info@ikfzdigitalzulassung.de' },
    { key: 'company_phone', value: '015224999190' },
    { key: 'social_facebook', value: 'https://www.facebook.com/ikfzdigitalzulassung' },
    { key: 'social_instagram', value: 'https://www.instagram.com/ikfz_digital_zulassung/' },
    { key: 'social_youtube', value: 'https://www.youtube.com/@ikfzdigitalzulassung' },
    { key: 'social_tiktok', value: 'https://www.tiktok.com/@meldino_kfz' },
    { key: 'og_default_image', value: 'https://ikfzdigitalzulassung.de/wp-content/uploads/2024/11/cropped-ikfz-logo-08.png' },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`   ✅ ${settings.length} settings seeded`);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 MIGRATION COMPLETE!\n');
  
  const counts = {
    pages: await prisma.page.count(),
    posts: await prisma.post.count(),
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    seo: await prisma.sEO.count(),
    settings: await prisma.siteSetting.count(),
    users: await prisma.user.count(),
  };

  console.log('📊 Database Summary:');
  console.log(`   📄 Pages:      ${counts.pages}`);
  console.log(`   📝 Posts:      ${counts.posts}`);
  console.log(`   📂 Categories: ${counts.categories}`);
  console.log(`   🏷️  Tags:       ${counts.tags}`);
  console.log(`   🔍 SEO:        ${counts.seo}`);
  console.log(`   ⚙️  Settings:   ${counts.settings}`);
  console.log(`   👤 Users:      ${counts.users}`);
  console.log('\n' + '═'.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Migration failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
