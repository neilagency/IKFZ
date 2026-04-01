/**
 * Backfill featured images for blog posts by matching ogImage URLs to local files.
 * Handles cases where local files have size suffixes (-800x800) or different variants.
 *
 * Usage: npx tsx scripts/backfill-blog-images.ts
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

/** Build an index of all files in public/uploads/ */
function indexUploads(dir: string, prefix = '/uploads'): Map<string, string> {
  const index = new Map<string, string>();
  if (!fs.existsSync(dir)) return index;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const pubPath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      const sub = indexUploads(fullPath, pubPath);
      for (const [k, v] of sub) index.set(k, v);
    } else {
      index.set(pubPath.toLowerCase(), pubPath);
    }
  }
  return index;
}

/** Try to find a local file matching the ogImage URL */
function findLocalMatch(ogUrl: string, fileIndex: Map<string, string>): string | null {
  // Extract the path portion: /uploads/2025/01/filename.webp
  const wpPath = ogUrl.replace('https://ikfzdigitalzulassung.de/wp-content', '');
  
  // 1. Exact match
  const exact = fileIndex.get(wpPath.toLowerCase());
  if (exact) return exact;

  // 2. Try with -800x800 suffix (common WP thumbnail)
  const ext = path.extname(wpPath);
  const base = wpPath.slice(0, -ext.length);
  // Remove WP edit suffix like -e1737506234119
  const baseClean = base.replace(/-e\d{10,}$/, '');
  
  const variants = [
    `${baseClean}-800x800${ext}`,
    `${baseClean}-1300x731${ext}`,
    `${baseClean}-1536x863${ext}`,
    `${baseClean}-1536x864${ext}`,
    `${baseClean}-768x432${ext}`,
    `${baseClean}-400x225${ext}`,
    `${baseClean}${ext}`,  // without -e suffix
  ];

  for (const v of variants) {
    const match = fileIndex.get(v.toLowerCase());
    if (match) return match;
  }

  // 3. Try basename matching (filename without directory)
  const basename = path.basename(wpPath, ext).replace(/-e\d{10,}$/, '').toLowerCase();
  for (const [key, val] of fileIndex) {
    const keyBase = path.basename(key, path.extname(key)).toLowerCase();
    if (keyBase === basename || keyBase.startsWith(basename + '-')) {
      // Prefer larger variants
      if (keyBase.includes('800x800') || keyBase.includes('1300') || keyBase.includes('1536') || keyBase === basename) {
        return val;
      }
    }
  }
  
  // 4. Last resort: any file starting with the basename
  for (const [key, val] of fileIndex) {
    const keyBase = path.basename(key, path.extname(key)).toLowerCase();
    if (keyBase.startsWith(basename)) {
      return val;
    }
  }

  return null;
}

async function main() {
  console.log('🖼️  Blog Featured Image Backfill (Local Matching)');
  console.log('='.repeat(55) + '\n');

  // Build file index
  const fileIndex = indexUploads(UPLOADS_ROOT);
  console.log(`📁 Indexed ${fileIndex.size} files in public/uploads/\n`);

  const posts = await prisma.blogPost.findMany({
    where: { featuredImage: '' },
    select: { id: true, slug: true, ogImage: true },
  });

  console.log(`📋 ${posts.length} posts need featured images\n`);

  let matched = 0;
  let missed = 0;

  for (const post of posts) {
    if (!post.ogImage) {
      console.log(`  ⏭️  ${post.slug} — no ogImage`);
      missed++;
      continue;
    }

    const localPath = findLocalMatch(post.ogImage, fileIndex);
    if (localPath) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { featuredImage: localPath },
      });
      console.log(`  ✅ ${post.slug} → ${localPath}`);
      matched++;
    } else {
      console.log(`  ❌ ${post.slug} — no local match for ${post.ogImage}`);
      missed++;
    }
  }

  console.log(`\n${'='.repeat(55)}`);
  console.log(`✅ Matched: ${matched}`);
  console.log(`❌ Missed: ${missed}`);

  await prisma.$disconnect();
}

main().catch(console.error);
