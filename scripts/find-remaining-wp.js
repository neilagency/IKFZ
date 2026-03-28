const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'prisma/dev.db'));

const pages = db.prepare("SELECT slug, content FROM Page WHERE content LIKE '%wp-content%'").all();
for (const p of pages) {
  const matches = p.content.match(/[^\s"'<>]*wp-content[^\s"'<>]*/g) || [];
  const unique = [...new Set(matches)];
  if (unique.length > 0) {
    console.log(p.slug + ':');
    unique.forEach(u => console.log('  ' + u));
  }
}
