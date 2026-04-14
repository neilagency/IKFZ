/**
 * City Coverage Validation Script
 * 
 * Checks which cities in cities.json have matching CSV authority entries
 * and reports gaps, match quality, and statistics.
 * 
 * Usage: npx tsx scripts/check-city-coverage.ts
 */

import { getCities, getAuthority } from '../src/data/cities';
import { fuzzyMatchAuthority, getCSVStats, parseCSV, normalizeGerman } from '../src/lib/csvParser';

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  City ↔ CSV Authority Coverage Report');
  console.log('═══════════════════════════════════════════════════════════\n');

  // CSV stats
  const stats = getCSVStats();
  console.log(`CSV Statistics:`);
  console.log(`  Total entries:  ${stats.total}`);
  console.log(`  Main offices:   ${stats.mainOffices}`);
  console.log(`  Branch offices: ${stats.branches}`);
  console.log(`  States covered: ${stats.states} (${stats.stateList.join(', ')})`);
  console.log('');

  // Check each city
  const cities = getCities();
  let matched = 0;
  let unmatched = 0;
  const gaps: { slug: string; name: string }[] = [];
  const results: { slug: string; name: string; match: string; score: number; type: string; authority: string }[] = [];

  for (const city of cities) {
    const match = fuzzyMatchAuthority(city.name, city.slug);
    if (match) {
      matched++;
      results.push({
        slug: city.slug,
        name: city.name,
        match: match.authority.csvCity,
        score: match.score,
        type: match.matchType,
        authority: match.authority.name,
      });
    } else {
      unmatched++;
      gaps.push({ slug: city.slug, name: city.name });
    }
  }

  // Print matches
  console.log(`\n── Matched Cities (${matched}/${cities.length}) ──────────────────\n`);
  console.log('  Slug                 City Name                CSV Match                     Score  Type        Authority');
  console.log('  ────────────────────────────────────────────────────────────────────────────────────────────────────────');
  
  for (const r of results.sort((a, b) => a.score - b.score)) {
    const slug = r.slug.padEnd(20);
    const name = r.name.padEnd(24);
    const match = r.match.padEnd(29);
    const score = String(r.score).padEnd(6);
    const type = r.type.padEnd(11);
    console.log(`  ${slug} ${name} ${match} ${score} ${type} ${r.authority}`);
  }

  // Print gaps
  if (gaps.length > 0) {
    console.log(`\n── UNMATCHED Cities (${unmatched}) ⚠️ ──────────────────\n`);
    for (const g of gaps) {
      // Show what the fuzzy search finds with more context
      const entries = parseCSV();
      const normalized = normalizeGerman(g.name);
      const possibles = entries
        .filter(e => {
          const n = normalizeGerman(e.csvCity);
          return n.includes(normalized.slice(0, 4)) || normalized.includes(n.slice(0, 4));
        })
        .slice(0, 3)
        .map(e => `${e.csvCity} (${e.name})`);
      
      console.log(`  ❌ ${g.slug.padEnd(20)} ${g.name}`);
      if (possibles.length) {
        console.log(`     Possible matches: ${possibles.join(', ')}`);
      }
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${matched}/${cities.length} cities matched (${Math.round(matched / cities.length * 100)}%)`);
  if (unmatched > 0) {
    console.log(`  ⚠️  ${unmatched} cities need manual mapping or CSV updates`);
  } else {
    console.log(`  ✅ All cities have CSV authority matches`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  // Score distribution
  const scoreBuckets = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, '<60': 0 };
  for (const r of results) {
    if (r.score >= 90) scoreBuckets['90-100']++;
    else if (r.score >= 80) scoreBuckets['80-89']++;
    else if (r.score >= 70) scoreBuckets['70-79']++;
    else if (r.score >= 60) scoreBuckets['60-69']++;
    else scoreBuckets['<60']++;
  }
  console.log('  Match Quality Distribution:');
  for (const [bucket, count] of Object.entries(scoreBuckets)) {
    if (count > 0) {
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`    ${bucket.padEnd(8)} ${bar} (${count})`);
    }
  }
  console.log('');
}

main();
