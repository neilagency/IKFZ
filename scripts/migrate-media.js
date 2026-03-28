/**
 * PHASE 2-4: Download all WordPress media and update database references
 * 
 * This script:
 * 1. Extracts all wp-content URLs from Page/Post content in SQLite
 * 2. Downloads each file to public/uploads/ preserving directory structure
 * 3. Updates all database content to use local /uploads/ paths
 * 4. Reports any failures
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const DB_PATH = path.join(__dirname, '..', 'prisma/dev.db');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const WP_ORIGIN = 'https://ikfzdigitalzulassung.de';

const db = new Database(DB_PATH);

// ─── Helpers ───────────────────────────────────────────

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    fs.mkdirSync(dir, { recursive: true });

    const getter = url.startsWith('https') ? https : http;
    const request = getter.get(url, { timeout: 30000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
      file.on('error', reject);
    });
    request.on('error', reject);
    request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

function extractWpUrls(text) {
  if (!text) return [];
  const regex = /https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\/[^\s"'<>)}\]\\]+/g;
  const matches = text.match(regex) || [];
  return matches.map(u => u.replace(/[,;]+$/, ''));
}

function wpUrlToLocalPath(url) {
  // https://ikfzdigitalzulassung.de/wp-content/uploads/2024/11/logo.png
  // -> /uploads/2024/11/logo.png
  const match = url.match(/\/wp-content\/uploads\/(.+)/);
  if (!match) return null;
  return '/uploads/' + match[1];
}

// ─── Phase 1: Collect all unique URLs ───────────────────

console.log('=== PHASE 1: Collecting all wp-content URLs from database ===\n');

const allUrls = new Set();

// From Page content
const pages = db.prepare("SELECT id, slug, content FROM Page WHERE content LIKE '%wp-content%'").all();
console.log(`Found ${pages.length} pages with wp-content references`);
pages.forEach(p => {
  extractWpUrls(p.content).forEach(u => allUrls.add(u));
});

// From Post content  
const posts = db.prepare("SELECT id, slug, content FROM Post WHERE content LIKE '%wp-content%'").all();
console.log(`Found ${posts.length} posts with wp-content references`);
posts.forEach(p => {
  extractWpUrls(p.content).forEach(u => allUrls.add(u));
});

// From Post featuredImage
try {
  const postFI = db.prepare("SELECT featuredImage FROM Post WHERE featuredImage LIKE '%wp-content%'").all();
  postFI.forEach(p => { if (p.featuredImage) allUrls.add(p.featuredImage); });
} catch(e) {}

// From Page featuredImage
try {
  const pageFI = db.prepare("SELECT featuredImage FROM Page WHERE featuredImage LIKE '%wp-content%'").all();
  pageFI.forEach(p => { if (p.featuredImage) allUrls.add(p.featuredImage); });
} catch(e) {}

const urlList = [...allUrls].sort();
console.log(`\nTotal unique wp-content URLs: ${urlList.length}\n`);

// ─── Phase 2: Download all media ────────────────────────

async function downloadAllMedia() {
  console.log('=== PHASE 2: Downloading media files ===\n');
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i];
    const localPath = wpUrlToLocalPath(url);
    if (!localPath) {
      console.log(`  [SKIP] Cannot parse: ${url}`);
      skipped++;
      continue;
    }

    const destPath = path.join(PUBLIC_DIR, localPath);
    
    // Skip if already downloaded
    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`  [${i+1}/${urlList.length}] Downloading ${path.basename(localPath)}...`);
      await downloadFile(url, destPath);
      const size = fs.statSync(destPath).size;
      console.log(` OK (${(size/1024).toFixed(1)}KB)`);
      downloaded++;
    } catch (err) {
      console.log(` FAILED: ${err.message}`);
      failures.push({ url, error: err.message });
      failed++;
    }
  }

  console.log(`\nDownload complete: ${downloaded} new, ${skipped} skipped, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailed downloads:');
    failures.forEach(f => console.log(`  ${f.url} -> ${f.error}`));
  }

  return failures;
}

// ─── Phase 3: Update database content ───────────────────

function updateDatabaseContent() {
  console.log('\n=== PHASE 3: Updating database content ===\n');

  const updatePage = db.prepare("UPDATE Page SET content = ? WHERE id = ?");
  const updatePost = db.prepare("UPDATE Post SET content = ? WHERE id = ?");

  let pagesUpdated = 0;
  let postsUpdated = 0;

  // Update pages
  const allPages = db.prepare("SELECT id, slug, content FROM Page WHERE content LIKE '%ikfzdigitalzulassung.de/wp-content%'").all();
  for (const page of allPages) {
    let newContent = page.content;
    // Replace all wp-content URLs with local paths
    newContent = newContent.replace(
      /https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\//g,
      '/uploads/'
    );
    if (newContent !== page.content) {
      updatePage.run(newContent, page.id);
      pagesUpdated++;
      console.log(`  Updated page: ${page.slug}`);
    }
  }

  // Update posts
  const allPosts = db.prepare("SELECT id, slug, content FROM Post WHERE content LIKE '%ikfzdigitalzulassung.de/wp-content%'").all();
  for (const post of allPosts) {
    let newContent = post.content;
    newContent = newContent.replace(
      /https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\//g,
      '/uploads/'
    );
    if (newContent !== post.content) {
      updatePost.run(newContent, post.id);
      postsUpdated++;
      console.log(`  Updated post: ${post.slug}`);
    }
  }

  // Update post featuredImage
  try {
    const updatePostFI = db.prepare("UPDATE Post SET featuredImage = REPLACE(featuredImage, 'https://ikfzdigitalzulassung.de/wp-content/uploads/', '/uploads/') WHERE featuredImage LIKE '%ikfzdigitalzulassung.de/wp-content%'");
    const fiResult = updatePostFI.run();
    if (fiResult.changes > 0) console.log(`  Updated ${fiResult.changes} post featuredImages`);
  } catch(e) {}

  // Update page featuredImage
  try {
    const updatePageFI = db.prepare("UPDATE Page SET featuredImage = REPLACE(featuredImage, 'https://ikfzdigitalzulassung.de/wp-content/uploads/', '/uploads/') WHERE featuredImage LIKE '%ikfzdigitalzulassung.de/wp-content%'");
    const fiResult = updatePageFI.run();
    if (fiResult.changes > 0) console.log(`  Updated ${fiResult.changes} page featuredImages`);
  } catch(e) {}

  // Also handle trustindex CSS reference
  const trustPages = db.prepare("SELECT id, slug, content FROM Page WHERE content LIKE '%ikfzdigitalzulassung.de/wp-content/uploads/trustindex%'").all();
  for (const page of trustPages) {
    let newContent = page.content;
    newContent = newContent.replace(
      /https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\/trustindex[^\s"'<>)}\]\\]*/g,
      ''
    );
    if (newContent !== page.content) {
      updatePage.run(newContent, page.id);
      console.log(`  Cleaned trustindex ref in: ${page.slug}`);
    }
  }

  console.log(`\nDatabase updated: ${pagesUpdated} pages, ${postsUpdated} posts`);
}

// ─── Phase 4: Verify ────────────────────────────────────

function verify() {
  console.log('\n=== PHASE 4: Verification ===\n');
  
  const remainingPages = db.prepare("SELECT slug FROM Page WHERE content LIKE '%ikfzdigitalzulassung.de/wp-content%'").all();
  const remainingPosts = db.prepare("SELECT slug FROM Post WHERE content LIKE '%ikfzdigitalzulassung.de/wp-content%'").all();
  
  if (remainingPages.length === 0 && remainingPosts.length === 0) {
    console.log('✅ No wp-content URLs remain in the database!');
  } else {
    console.log('⚠️  Remaining wp-content references:');
    remainingPages.forEach(p => console.log(`  Page: ${p.slug}`));
    remainingPosts.forEach(p => console.log(`  Post: ${p.slug}`));
  }

  // Count downloaded files
  const uploadsDir = path.join(PUBLIC_DIR, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    let count = 0;
    function countFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) countFiles(path.join(dir, entry.name));
        else count++;
      }
    }
    countFiles(uploadsDir);
    console.log(`\n📁 Total local media files: ${count}`);
  }
}

// ─── Run ─────────────────────────────────────────────────

async function main() {
  console.log('WordPress Media Migration Script');
  console.log('================================\n');
  
  const failures = await downloadAllMedia();
  updateDatabaseContent();
  verify();

  console.log('\n================================');
  console.log('Migration complete!');
  
  if (failures.length > 0) {
    console.log(`\n⚠️  ${failures.length} files could not be downloaded.`);
    console.log('These may be CSS/JS files that are not needed, or files that no longer exist on the server.');
  }
}

main().catch(console.error);
