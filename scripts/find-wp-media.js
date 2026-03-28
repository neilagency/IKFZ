const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'prisma/dev.db'));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
const allUrls = new Set();

for (const t of tables) {
  const cols = db.pragma('table_info("' + t.name + '")');
  for (const col of cols) {
    if (col.type === 'TEXT' || col.type === '') {
      try {
        const rows = db.prepare('SELECT rowid, "' + col.name + '" FROM "' + t.name + '" WHERE "' + col.name + '" LIKE "%wp-content%" OR "' + col.name + '" LIKE "%ikfzdigitalzulassung%"').all();
        if (rows.length > 0) {
          console.log('\n=== ' + t.name + '.' + col.name + ' (' + rows.length + ' rows) ===');
          for (const r of rows) {
            const val = r[col.name];
            if (!val) continue;
            const urls = val.match(/https?:\/\/[^\s"'<>)]+wp-content[^\s"'<>)]*/g) || [];
            urls.forEach(u => {
              // clean trailing punctuation
              const clean = u.replace(/[,;]+$/, '');
              allUrls.add(clean);
            });
            console.log('Row ' + r.rowid + ': ' + urls.length + ' URLs found');
          }
        }
      } catch(e) { /* skip */ }
    }
  }
}

console.log('\n\n========== ALL UNIQUE WP-CONTENT URLS ==========');
const sorted = [...allUrls].sort();
sorted.forEach(u => console.log(u));
console.log('\nTotal unique URLs: ' + sorted.length);
