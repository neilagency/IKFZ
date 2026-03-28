/**
 * WordPress to Next.js Migration Script
 * 
 * Fetches content from WordPress REST API and saves as JSON files
 * for use in the Next.js application.
 * 
 * Usage: npm run migrate
 */

import * as fs from 'fs';
import * as path from 'path';

const WP_API_BASE = 'https://ikfzdigitalzulassung.de/wp-json/wp/v2';
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data');

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
}

interface WPPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  date: string;
  modified: string;
  link: string;
  parent: number;
}

interface WPMedia {
  id: number;
  slug: string;
  title: { rendered: string };
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
}

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${WP_API_BASE}/${endpoint}?per_page=100&page=${page}`;
      console.log(`  Fetching: ${url}`);

      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 400) {
          // No more pages
          hasMore = false;
          break;
        }
        console.warn(`  Warning: HTTP ${response.status} for ${endpoint} page ${page}`);
        hasMore = false;
        break;
      }

      const data = (await response.json()) as T[];
      allItems.push(...data);

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;
    } catch (error) {
      console.error(`  Error fetching ${endpoint} page ${page}:`, error);
      hasMore = false;
    }
  }

  return allItems;
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

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

async function migrateContent() {
  console.log('🚀 Starting WordPress to Next.js migration...\n');

  ensureDir(OUTPUT_DIR);

  // Fetch Pages
  console.log('📄 Fetching pages...');
  try {
    const pages = await fetchAllPages<WPPage>('pages');
    console.log(`  ✅ Found ${pages.length} pages`);

    const processedPages = pages.map((page) => ({
      id: page.id,
      slug: page.slug,
      title: stripHtml(page.title.rendered),
      content: page.content.rendered,
      url: page.link,
      modified: page.modified,
      parent: page.parent,
    }));

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'pages.json'),
      JSON.stringify(processedPages, null, 2)
    );
    console.log('  💾 Saved pages.json');
  } catch (error) {
    console.warn('  ⚠️ Could not fetch pages (API may be unavailable):', error);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'pages.json'), '[]');
  }

  // Fetch Posts
  console.log('\n📝 Fetching posts...');
  try {
    const posts = await fetchAllPages<WPPost>('posts');
    console.log(`  ✅ Found ${posts.length} posts`);

    const processedPosts = posts.map((post) => ({
      id: post.id,
      slug: post.slug,
      title: stripHtml(post.title.rendered),
      content: post.content.rendered,
      excerpt: stripHtml(post.excerpt.rendered),
      url: post.link,
      date: post.date,
      modified: post.modified,
      categories: post.categories,
      tags: post.tags,
      featuredMedia: post.featured_media,
    }));

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'posts.json'),
      JSON.stringify(processedPosts, null, 2)
    );
    console.log('  💾 Saved posts.json');
  } catch (error) {
    console.warn('  ⚠️ Could not fetch posts:', error);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'posts.json'), '[]');
  }

  // Fetch Media
  console.log('\n🖼️  Fetching media...');
  try {
    const media = await fetchAllPages<WPMedia>('media');
    console.log(`  ✅ Found ${media.length} media items`);

    const processedMedia = media.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: stripHtml(item.title.rendered),
      url: item.source_url,
      alt: item.alt_text,
      width: item.media_details?.width || 0,
      height: item.media_details?.height || 0,
      sizes: item.media_details?.sizes
        ? Object.entries(item.media_details.sizes).reduce(
            (acc, [key, val]) => ({
              ...acc,
              [key]: { url: val.source_url, width: val.width, height: val.height },
            }),
            {}
          )
        : {},
    }));

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'media.json'),
      JSON.stringify(processedMedia, null, 2)
    );
    console.log('  💾 Saved media.json');
  } catch (error) {
    console.warn('  ⚠️ Could not fetch media:', error);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'media.json'), '[]');
  }

  // Fetch Categories
  console.log('\n📂 Fetching categories...');
  try {
    const categories = await fetchAllPages<{ id: number; slug: string; name: string; count: number }>('categories');
    console.log(`  ✅ Found ${categories.length} categories`);

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'categories.json'),
      JSON.stringify(categories, null, 2)
    );
    console.log('  💾 Saved categories.json');
  } catch (error) {
    console.warn('  ⚠️ Could not fetch categories:', error);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'categories.json'), '[]');
  }

  console.log('\n✅ Migration complete! JSON files saved to src/data/');
  console.log('   Files: pages.json, posts.json, media.json, categories.json');
}

migrateContent().catch(console.error);
