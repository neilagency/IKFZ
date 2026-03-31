import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function run() {
  const pages = await prisma.page.findMany({ select: { slug: true, status: true, pageType: true } });
  const blogPosts = await prisma.blogPost.findMany({ select: { slug: true, status: true } });
  
  console.log('=== DB Pages ===');
  console.log('Total pages:', pages.length);
  console.log('Published:', pages.filter(p => p.status === 'published').length);
  
  console.log('\n=== Blog Posts ===');
  console.log('Total posts:', blogPosts.length);
  console.log('Published:', blogPosts.filter(p => p.status === 'published').length);

  const wpUrls = JSON.parse(fs.readFileSync('audit/wordpress-urls.json', 'utf8'));
  const wpSlugs: string[] = wpUrls.map((p: any) => p.slug);
  
  const staticRoutes = new Set([
    '', 'agb', 'impressum', 'datenschutzerklarung', 'evb', 'faq',
    'kfz-services', 'kfz-online-abmelden', 'auto-online-anmelden',
    'auto-verkaufen', 'motorrad-online-anmelden', 'kfz-versicherung-berechnen',
    'kfz-zulassung-in-deiner-stadt', 'bestellung-erfolgreich', 'zahlung-fehlgeschlagen',
    'motorrad-versicherung-vergleichen', 'insiderwissen', 'konto', 'anmelden'
  ]);
  
  const noindexSlugs = new Set([
    'antragsuebersicht', 'antragsuebersicht-2', 'warenkorb', 'mein-konto',
    'kasse', 'starseite-2', 'startseite', 'bezahlmoeglichkeiten',
    'kennzeichen-bestellen', 'ikfzdigitalblog'
  ]);
  
  const dbPageSlugs = new Set(pages.map(p => p.slug));
  const dbBlogSlugs = new Set(blogPosts.map(p => p.slug));
  
  const missing: string[] = [];
  const found: string[] = [];
  const noindex: string[] = [];
  
  for (const slug of wpSlugs) {
    if (noindexSlugs.has(slug)) {
      noindex.push(slug);
    } else if (staticRoutes.has(slug) || dbPageSlugs.has(slug) || dbBlogSlugs.has(slug)) {
      found.push(slug);
    } else {
      missing.push(slug);
    }
  }
  
  console.log('\n=== URL COMPARISON ===');
  console.log('WP URLs total:', wpSlugs.length);
  console.log('Found in new site:', found.length);
  console.log('Noindex (expected):', noindex.length);
  console.log('MISSING (need redirect):', missing.length);
  
  if (missing.length > 0) {
    console.log('\n=== MISSING URLS ===');
    missing.forEach(s => console.log(' -', s));
  }
  
  // Check old sitemap post URLs
  const oldPostSlugs = [
    'kfz-zulassung-online-abgelehnt-steuerrueckstaende',
    'kfz-online-service-2025', 'online-zulassung-aufenthaltstitel',
    'online-zulassung-fuer-ihr-fahrzeug', 'online-zulassung-fuer-alle-fahrzeugtypen',
    'kfz-zulassung-ohne-behoerdengang', 'fahrzeug-online-zulassen',
    'online-zulassung-fuer-gebrauchtwagen', 'zulassungsstelle',
    'kfz-abmelden-online-in-deutschland', 'fahrzeugbrief',
    'ohne-warteschlangen', 'ohne-papierkram', 'fahrzeugschein',
    'kosten-24-95-euro', 'kennzeichen-mit-qr-code',
    'elektronischer-abmeldebescheid', 'sicherheitscode',
    'zulassungsbescheinigung-teil-1', 'fahrzeug-ausser-betrieb-setzen',
    'online-abmeldung', 'kfz-online-abmelden-ihr-leitfaden',
    'zulassungsservice', 'auto-online-abmelden', 'magdeburg',
    'kostenlos-online-auto-abmelden-deutschlandweit', 'auto-abmelden-online',
    'qr-code', 'digitale-kfz-zulassung-2024', 'kaufvertrag-auto',
    'eucaris', 'fahrzeugschein-kw', 'auto-abmelden'
  ];
  
  const sitemapMissing: string[] = [];
  for (const slug of oldPostSlugs) {
    if (!staticRoutes.has(slug) && !dbPageSlugs.has(slug) && !dbBlogSlugs.has(slug) && !noindexSlugs.has(slug)) {
      sitemapMissing.push(slug);
    }
  }
  
  if (sitemapMissing.length > 0) {
    console.log('\n=== OLD SITEMAP POST SLUGS MISSING ===');
    sitemapMissing.forEach(s => console.log(' -', s));
  } else {
    console.log('\n=== All old sitemap post slugs found! ===');
  }

  const products = await prisma.product.findMany({ select: { slug: true } });
  console.log('\n=== Products ===');
  products.forEach(p => console.log(' -', p.slug));
  
  // List all DB page slugs for reference
  console.log('\n=== All DB Page Slugs ===');
  pages.forEach(p => console.log(` - ${p.slug} (${p.pageType}, ${p.status})`));
  
  console.log('\n=== All Blog Post Slugs ===');
  blogPosts.forEach(p => console.log(` - ${p.slug} (${p.status})`));
  
  await prisma.$disconnect();
}
run();
