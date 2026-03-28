const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'prisma/dev.db'));

// Remove all wp-content/themes and wp-content/plugins references from content
// These are WordPress theme/plugin CSS/JS that don't belong in the migrated content
const updatePage = db.prepare("UPDATE Page SET content = ? WHERE id = ?");

const pages = db.prepare("SELECT id, slug, content FROM Page WHERE content LIKE '%wp-content%'").all();
let updated = 0;

for (const page of pages) {
  let content = page.content;
  
  // Remove <link> tags referencing wp-content/themes or wp-content/plugins
  content = content.replace(/<link[^>]*wp-content\/(themes|plugins)[^>]*>/gi, '');
  
  // Remove <style> blocks that reference wp-content
  content = content.replace(/<style[^>]*>[^<]*wp-content[^<]*<\/style>/gi, '');
  
  // Remove standalone URL references to wp-content/themes or wp-content/plugins
  content = content.replace(/https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/(themes|plugins)\/[^\s"'<>)}\]\\]*/gi, '');
  
  // Also remove any remaining trustindex references
  content = content.replace(/https?:\/\/ikfzdigitalzulassung\.de\/wp-content\/uploads\/trustindex[^\s"'<>)}\]\\]*/gi, '');
  
  if (content !== page.content) {
    updatePage.run(content, page.id);
    updated++;
    console.log('Cleaned:', page.slug);
  }
}

// Verify
const remaining = db.prepare("SELECT slug FROM Page WHERE content LIKE '%wp-content%'").all();
const remainingPosts = db.prepare("SELECT slug FROM Post WHERE content LIKE '%wp-content%'").all();

console.log('\n--- Verification ---');
console.log('Updated pages:', updated);
console.log('Remaining pages with wp-content:', remaining.length);
remaining.forEach(p => console.log('  ', p.slug));
console.log('Remaining posts with wp-content:', remainingPosts.length);
remainingPosts.forEach(p => console.log('  ', p.slug));

if (remaining.length === 0 && remainingPosts.length === 0) {
  console.log('\n✅ All wp-content references removed from database!');
}
