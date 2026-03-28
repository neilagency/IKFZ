/**
 * Media Backfill Script
 * 
 * Scans /public/uploads/ directory and database content fields
 * to populate the Media table with all existing images.
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
};

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  console.log('🔍 Media Backfill Script');
  console.log('========================\n');

  // 1. Get existing media URLs from DB to avoid duplicates
  const existingMedia = await prisma.media.findMany({ select: { url: true } });
  const existingUrls = new Set(existingMedia.map(m => m.url));
  console.log(`📦 Existing media records in DB: ${existingUrls.size}`);

  // 2. Scan /public/uploads/ directory
  const allFiles = walkDir(UPLOADS_DIR);
  console.log(`📁 Files found in /public/uploads/: ${allFiles.length}\n`);

  let created = 0;
  let skipped = 0;

  for (const filepath of allFiles) {
    const relativePath = '/' + path.relative(path.join(process.cwd(), 'public'), filepath);
    const url = relativePath.replace(/\\/g, '/');

    if (existingUrls.has(url)) {
      skipped++;
      continue;
    }

    const stat = fs.statSync(filepath);
    const filename = path.basename(filepath);
    const mimeType = getMimeType(filepath);

    await prisma.media.create({
      data: {
        url,
        filename,
        mimeType,
        size: stat.size,
        alt: null,
      },
    });

    existingUrls.add(url);
    created++;
  }

  console.log(`✅ Created ${created} new media records from /public/uploads/`);
  console.log(`⏭️  Skipped ${skipped} already existing\n`);

  // 3. Scan database content fields for image URLs not yet tracked
  console.log('🔍 Scanning database content fields...\n');

  // Check pages content + featuredImage
  const pages = await prisma.page.findMany({
    select: { content: true, featuredImage: true },
  });

  // Check posts content + featuredImage
  const posts = await prisma.post.findMany({
    select: { content: true, featuredImage: true },
  });

  // Check SEO ogImage
  const seoRecords = await prisma.sEO.findMany({
    select: { ogImage: true },
  });

  // Extract all /uploads/ URLs from HTML content
  const urlPattern = /\/uploads\/[^\s"'<>)]+/g;
  const contentUrls = new Set<string>();

  for (const page of pages) {
    if (page.featuredImage?.startsWith('/uploads/')) contentUrls.add(page.featuredImage);
    const matches = page.content?.match(urlPattern) || [];
    matches.forEach(u => contentUrls.add(u));
  }

  for (const post of posts) {
    if (post.featuredImage?.startsWith('/uploads/')) contentUrls.add(post.featuredImage);
    const matches = post.content?.match(urlPattern) || [];
    matches.forEach(u => contentUrls.add(u));
  }

  for (const seo of seoRecords) {
    if (seo.ogImage?.startsWith('/uploads/')) contentUrls.add(seo.ogImage);
  }

  let contentCreated = 0;
  for (const url of contentUrls) {
    if (existingUrls.has(url)) continue;

    // Check if physical file exists
    const physicalPath = path.join(process.cwd(), 'public', url);
    if (!fs.existsSync(physicalPath)) {
      console.log(`  ⚠️  Referenced but missing file: ${url}`);
      continue;
    }

    const stat = fs.statSync(physicalPath);
    const filename = path.basename(url);
    const mimeType = getMimeType(url);

    await prisma.media.create({
      data: {
        url,
        filename,
        mimeType,
        size: stat.size,
        alt: null,
      },
    });

    existingUrls.add(url);
    contentCreated++;
  }

  console.log(`✅ Created ${contentCreated} additional media records from DB content fields`);

  // 4. Final count
  const totalMedia = await prisma.media.count();
  console.log(`\n📊 Total media records in DB: ${totalMedia}`);
  console.log('🎉 Media backfill complete!');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
