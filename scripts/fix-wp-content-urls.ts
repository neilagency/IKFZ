/**
 * fix-wp-content-urls.ts
 *
 * Rewrites all WordPress-origin URLs inside Page and BlogPost content stored
 * in the local database, so the site has zero runtime dependency on the WP domain.
 *
 * Replacements performed:
 *  1. https://ikfzdigitalzulassung.de/wp-content/uploads/ → /uploads/
 *  2. https://ikfzdigitalzulassung.de/ (internal absolute links) → /
 *
 * Also downloads any media files that exist in the DB content but are NOT yet
 * present in public/uploads/ (dry-run by default, pass --download to fetch).
 *
 * Usage:
 *   npx tsx scripts/fix-wp-content-urls.ts           (dry-run / stats only)
 *   npx tsx scripts/fix-wp-content-urls.ts --fix      (rewrite DB in-place)
 *   npx tsx scripts/fix-wp-content-urls.ts --download (also fetch missing files)
 *   npx tsx scripts/fix-wp-content-urls.ts --fix --download
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// ── Init Prisma ────────────────────────────────────────────────────────────
const adapter = new PrismaBetterSqlite3({ url: `file:${path.join(process.cwd(), 'prisma', 'dev.db')}` });
const prisma = new PrismaClient({ adapter } as never);

const WP_UPLOADS = 'https://ikfzdigitalzulassung.de/wp-content/uploads/';
const WP_DOMAIN  = 'https://ikfzdigitalzulassung.de/';
const WP_DOMAIN_WWW = 'https://www.ikfzdigitalzulassung.de/';
const WP_THEME_CSS_PATTERN = /<link[^>]*\/wp-content\/themes\/[^>]*>/g;
const LOCAL_UPLOADS_PREFIX = '/uploads/';
const LOCAL_ROOT_PREFIX    = '/';
const PUBLIC_DIR = path.join(process.cwd(), 'public');

const FIX      = process.argv.includes('--fix');
const DOWNLOAD = process.argv.includes('--download');

// ── URL rewrite ────────────────────────────────────────────────────────────
function rewriteUrls(content: string | null): string {
  if (!content) return '';
  // 1. wp-content/uploads → /uploads/  (must run BEFORE the domain replace)
  let out = content.replaceAll(WP_UPLOADS, LOCAL_UPLOADS_PREFIX);
  // 2. Remove WP theme CSS <link> tags (woodmart, elementor, etc.)
  out = out.replace(WP_THEME_CSS_PATTERN, '');
  // 3. absolute internal links (with or without www) → relative
  out = out.replaceAll(WP_DOMAIN_WWW, LOCAL_ROOT_PREFIX);
  out = out.replaceAll(WP_DOMAIN, LOCAL_ROOT_PREFIX);
  return out;
}

// ── Extract all WP media URLs from content ─────────────────────────────────
function extractWpMediaUrls(content: string | null): string[] {
  if (!content) return [];
  const regex = /https:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\/[^"'<>\s]+/g;
  return [...new Set(content.match(regex) ?? [])];
}

// ── Download a single file ─────────────────────────────────────────────────
function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(res.headers.location!, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍  WordPress URL Migration Script`);
  console.log(`    Mode: ${FIX ? 'FIX (writes DB)' : 'DRY-RUN (read only)'} | Download: ${DOWNLOAD ? 'YES' : 'NO'}\n`);

  const pages = await prisma.page.findMany({ select: { id: true, slug: true, content: true, featuredImage: true } });
  const posts = await prisma.blogPost.findMany({ select: { id: true, slug: true, content: true, featuredImage: true } });

  let totalPagesFixed = 0;
  let totalPostsFixed = 0;
  const allWpUrls = new Set<string>();

  // ── Process Pages ──────────────────────────────────────────────────────
  for (const page of pages) {
    const wpUrls = extractWpMediaUrls(page.content);
    wpUrls.forEach(u => allWpUrls.add(u));

    const newContent = rewriteUrls(page.content);
    const newFeatured = page.featuredImage
      ? rewriteUrls(page.featuredImage)
      : page.featuredImage;

    const changed = newContent !== page.content || newFeatured !== page.featuredImage;
    if (changed) {
      totalPagesFixed++;
      console.log(`  📄  Page [${page.slug}] → URLs rewritten`);
      if (FIX) {
        await prisma.page.update({
          where: { id: page.id },
          data: { content: newContent, featuredImage: newFeatured },
        });
      }
    }
  }

  // ── Process BlogPosts ─────────────────────────────────────────────────
  for (const post of posts) {
    const wpUrls = extractWpMediaUrls(post.content);
    wpUrls.forEach(u => allWpUrls.add(u));

    const newContent = rewriteUrls(post.content);
    const newFeatured = post.featuredImage
      ? rewriteUrls(post.featuredImage)
      : post.featuredImage;

    const changed = newContent !== post.content || newFeatured !== post.featuredImage;
    if (changed) {
      totalPostsFixed++;
      console.log(`  📝  Post [${post.slug}] → URLs rewritten`);
      if (FIX) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: { content: newContent, featuredImage: newFeatured },
        });
      }
    }
  }

  // ── Report / Download missing media ───────────────────────────────────
  console.log(`\n📊  Summary:`);
  console.log(`    Pages to fix:     ${totalPagesFixed} / ${pages.length}`);
  console.log(`    Posts to fix:     ${totalPostsFixed} / ${posts.length}`);
  console.log(`    Unique WP URLs:   ${allWpUrls.size}`);

  let missing = 0;
  let present = 0;
  const missingFiles: string[] = [];

  for (const wpUrl of allWpUrls) {
    const relativePath = wpUrl.replace(WP_UPLOADS, '');
    const localPath = path.join(PUBLIC_DIR, 'uploads', relativePath);
    if (fs.existsSync(localPath)) {
      present++;
    } else {
      missing++;
      missingFiles.push(wpUrl);
    }
  }

  console.log(`    Media already local: ${present}`);
  console.log(`    Media missing:       ${missing}`);

  if (missingFiles.length > 0) {
    console.log(`\n⚠️   Missing media files:`);
    missingFiles.forEach(f => console.log(`    - ${f}`));

    if (DOWNLOAD) {
      console.log(`\n⬇️   Downloading ${missingFiles.length} missing files...`);
      let downloaded = 0;
      let failed = 0;
      for (const wpUrl of missingFiles) {
        const relativePath = wpUrl.replace(WP_UPLOADS, '');
        const localPath = path.join(PUBLIC_DIR, 'uploads', relativePath);
        try {
          await downloadFile(wpUrl, localPath);
          downloaded++;
          console.log(`    ✓  ${path.basename(localPath)}`);
        } catch (e: unknown) {
          failed++;
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`    ✗  ${path.basename(localPath)}: ${msg}`);
        }
      }
      console.log(`\n    Downloaded: ${downloaded}  Failed: ${failed}`);
    }
  }

  if (!FIX) {
    console.log(`\n💡  Run with --fix to apply DB changes`);
    console.log(`    npx tsx scripts/fix-wp-content-urls.ts --fix --download\n`);
  } else {
    console.log(`\n✅  DB updated successfully.\n`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
