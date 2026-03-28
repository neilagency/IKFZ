const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'prisma/dev.db'));

// Check Page.featuredImage
const pages = db.prepare("SELECT slug, featuredImage FROM Page WHERE featuredImage IS NOT NULL").all();
console.log('Pages with featuredImage:', pages.length);
pages.forEach(p => console.log('  ', p.slug, '->', p.featuredImage));

// Check Settings
try {
  const settings = db.prepare("SELECT key, value FROM Setting").all();
  console.log('\nSettings:');
  settings.forEach(s => console.log('  ', s.key, '=', s.value.substring(0, 120)));
} catch(e) {
  try {
    const settings = db.prepare("SELECT key, value FROM SiteSettings").all();
    console.log('\nSiteSettings:');
    settings.forEach(s => console.log('  ', s.key, '=', String(s.value).substring(0, 120)));
  } catch(e2) { console.log('\nSettings table not found'); }
}

// Check SEO ogImage
try {
  const seo = db.prepare("SELECT pageSlug, ogImage FROM SEO WHERE ogImage IS NOT NULL AND ogImage != ''").all();
  console.log('\nSEO ogImage entries:', seo.length);
  seo.forEach(s => console.log('  ', s.pageSlug, '->', s.ogImage));
} catch(e) { console.log('\nSEO table check error:', e.message); }

// Product images
try {
  const prodImages = db.prepare("SELECT url FROM ProductImage").all();
  console.log('\nProduct images:', prodImages.length);
  prodImages.forEach(i => console.log('  ', i.url));
} catch(e) { console.log('\nProductImage check error:', e.message); }

// Pages with external URLs in content
const pagesWithUrls = db.prepare("SELECT slug FROM Page WHERE content LIKE '%https://%'").all();
console.log('\nPages with https URLs in content:', pagesWithUrls.length);
pagesWithUrls.forEach(p => console.log('  ', p.slug));

// Posts with external URLs in content
const postsWithUrls = db.prepare("SELECT slug FROM Post WHERE content LIKE '%https://%'").all();
console.log('\nPosts with https URLs in content:', postsWithUrls.length);
postsWithUrls.forEach(p => console.log('  ', p.slug));

// Specific check for wp-content in content fields
const wpPages = db.prepare("SELECT slug FROM Page WHERE content LIKE '%wp-content%'").all();
console.log('\nPages with wp-content in content:', wpPages.length);
wpPages.forEach(p => console.log('  ', p.slug));

const wpPosts = db.prepare("SELECT slug FROM Post WHERE content LIKE '%wp-content%'").all();
console.log('\nPosts with wp-content in content:', wpPosts.length);
wpPosts.forEach(p => console.log('  ', p.slug));
