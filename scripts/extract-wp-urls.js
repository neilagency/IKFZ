const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'prisma/dev.db'));

const allUrls = new Set();

// Extract from Page content
const pages = db.prepare("SELECT content FROM Page WHERE content LIKE '%wp-content%'").all();
pages.forEach(p => {
  const urls = p.content.match(/https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\/[^\s"'<>)}\]]+/g) || [];
  urls.forEach(u => allUrls.add(u.replace(/[,;]+$/, '').replace(/\\$/, '')));
});

// Extract from Post content
const posts = db.prepare("SELECT content FROM Post WHERE content LIKE '%wp-content%'").all();
posts.forEach(p => {
  const urls = p.content.match(/https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\/[^\s"'<>)}\]]+/g) || [];
  urls.forEach(u => allUrls.add(u.replace(/[,;]+$/, '').replace(/\\$/, '')));
});

// Also check SEO table
try {
  const seoRows = db.prepare("SELECT * FROM SEO WHERE ogImage LIKE '%wp-content%'").all();
  seoRows.forEach(s => {
    if (s.ogImage) allUrls.add(s.ogImage);
  });
} catch(e) {}

// Check Post featuredImage
try {
  const postFI = db.prepare("SELECT featuredImage FROM Post WHERE featuredImage LIKE '%wp-content%'").all();
  postFI.forEach(p => allUrls.add(p.featuredImage));
} catch(e) {}

const sorted = [...allUrls].sort();
console.log(JSON.stringify(sorted, null, 2));
console.log('\n// Total unique URLs:', sorted.length);
