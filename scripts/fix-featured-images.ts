/**
 * Fetch featured images from WordPress API and update existing posts in the database.
 * 
 * Usage: npx tsx scripts/fix-featured-images.ts
 */

import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const WP_API_BASE = 'https://ikfzdigitalzulassung.de/wp-json/wp/v2';

const dbPath = path.join(new URL('.', import.meta.url).pathname, '..', 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: 'file:' + dbPath });
const prisma = new PrismaClient({ adapter });

interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  featured_media: number;
}

interface WPMedia {
  id: number;
  source_url: string;
  media_details?: {
    sizes?: {
      full?: { source_url: string };
      large?: { source_url: string };
      medium_large?: { source_url: string };
    };
  };
}

async function fetchAllWPPosts(): Promise<WPPost[]> {
  const all: WPPost[] = [];
  let page = 1;
  while (true) {
    const url = `${WP_API_BASE}/posts?per_page=100&page=${page}&_fields=id,slug,title,featured_media`;
    console.log(`  📥 ${url}`);
    const res = await fetch(url);
    if (!res.ok) break;
    const data = (await res.json()) as WPPost[];
    all.push(...data);
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1');
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

async function fetchMedia(mediaId: number): Promise<string | null> {
  if (!mediaId || mediaId === 0) return null;
  try {
    const res = await fetch(`${WP_API_BASE}/media/${mediaId}`);
    if (!res.ok) return null;
    const media = (await res.json()) as WPMedia;
    // Prefer large > medium_large > full > source_url
    return (
      media.media_details?.sizes?.large?.source_url ||
      media.media_details?.sizes?.medium_large?.source_url ||
      media.media_details?.sizes?.full?.source_url ||
      media.source_url ||
      null
    );
  } catch {
    return null;
  }
}

async function main() {
  console.log('🖼️  Fetching featured images from WordPress...\n');

  const wpPosts = await fetchAllWPPosts();
  console.log(`\n✅ ${wpPosts.length} posts fetched from WordPress\n`);

  let updated = 0;
  let skipped = 0;

  for (const wp of wpPosts) {
    // Find the post in our DB
    const dbPost = await prisma.post.findFirst({ where: { wpId: wp.id } });
    if (!dbPost) {
      console.log(`  ⏭️  ${wp.slug} — not in DB, skipping`);
      skipped++;
      continue;
    }

    if (dbPost.featuredImage) {
      console.log(`  ✅ ${wp.slug} — already has image`);
      skipped++;
      continue;
    }

    if (!wp.featured_media || wp.featured_media === 0) {
      // Try to get OG image from SEO data as fallback
      const seo = await prisma.sEO.findFirst({ where: { postId: dbPost.id } });
      if (seo?.ogImage) {
        await prisma.post.update({ where: { id: dbPost.id }, data: { featuredImage: seo.ogImage } });
        console.log(`  🖼️  ${wp.slug} — using OG image: ${seo.ogImage.substring(0, 60)}...`);
        updated++;
      } else {
        console.log(`  ⚠️  ${wp.slug} — no featured_media and no OG image`);
        skipped++;
      }
      continue;
    }

    // Fetch media from WP
    const imageUrl = await fetchMedia(wp.featured_media);
    if (imageUrl) {
      await prisma.post.update({ where: { id: dbPost.id }, data: { featuredImage: imageUrl } });
      console.log(`  🖼️  ${wp.slug} — ${imageUrl.substring(0, 80)}...`);
      updated++;
    } else {
      // Fallback to OG image
      const seo = await prisma.sEO.findFirst({ where: { postId: dbPost.id } });
      if (seo?.ogImage) {
        await prisma.post.update({ where: { id: dbPost.id }, data: { featuredImage: seo.ogImage } });
        console.log(`  🖼️  ${wp.slug} — using OG image fallback`);
        updated++;
      } else {
        console.log(`  ❌ ${wp.slug} — media fetch failed, no fallback`);
        skipped++;
      }
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Updated: ${updated} posts`);
  console.log(`⏭️  Skipped: ${skipped} posts`);
  
  await prisma.$disconnect();
}

main().catch(console.error);
