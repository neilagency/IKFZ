#!/usr/bin/env npx ts-node --project tsconfig.migrate.json
/**
 * expand-cities.ts
 * 
 * Expands cities.json from 50 to 200+ cities using the KBA CSV data.
 * Uses only main offices (non-Nebenstelle) as city candidates.
 * Maps Bundesland codes to full German state names and determines regions.
 * 
 * Usage:
 *   npx ts-node --project tsconfig.migrate.json scripts/expand-cities.ts
 *   npx ts-node --project tsconfig.migrate.json scripts/expand-cities.ts --dry-run
 */

import fs from 'fs';
import path from 'path';

// ── CSV Parsing (standalone, no module deps) ─────────────────────

interface CSVRow {
  code: string;
  stadt: string;
  bundesland: string;
  behoerdeName: string;
  plz: string;
  ort: string;
  strasse: string;
  telefon: string;
  email: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
}

// ── Mappings ─────────────────────────────────────────────────────

const BUNDESLAND_FULL: Record<string, string> = {
  'BB': 'Brandenburg', 'BE': 'Berlin', 'BW': 'Baden-Württemberg', 'BY': 'Bayern',
  'HB': 'Bremen', 'HE': 'Hessen', 'HH': 'Hamburg', 'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen', 'NW': 'Nordrhein-Westfalen', 'RP': 'Rheinland-Pfalz',
  'SH': 'Schleswig-Holstein', 'SL': 'Saarland', 'SN': 'Sachsen', 'ST': 'Sachsen-Anhalt', 'TH': 'Thüringen',
};

const STATE_TO_REGION: Record<string, string> = {
  'Berlin': 'Berlin-Brandenburg', 'Brandenburg': 'Berlin-Brandenburg',
  'Hamburg': 'Norddeutschland', 'Schleswig-Holstein': 'Norddeutschland', 'Bremen': 'Norddeutschland', 'Niedersachsen': 'Norddeutschland',
  'Mecklenburg-Vorpommern': 'Norddeutschland',
  'Nordrhein-Westfalen': 'Nordrhein-Westfalen',
  'Hessen': 'Hessen-Rheinland', 'Rheinland-Pfalz': 'Hessen-Rheinland', 'Saarland': 'Hessen-Rheinland',
  'Baden-Württemberg': 'Baden-Württemberg',
  'Bayern': 'Bayern',
  'Sachsen': 'Mitteldeutschland', 'Sachsen-Anhalt': 'Mitteldeutschland', 'Thüringen': 'Mitteldeutschland',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\s*\(stadt\)/gi, '').replace(/\s*\(land\)/gi, '')
    .replace(/\s*i\.br\.?$/i, '').replace(/-zentrale$/i, '').replace(/-stadt$/i, '')
    .replace(/ ot .+$/i, '').replace(/ - .+$/i, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function cleanCityName(csvCity: string): string {
  return csvCity
    .replace(/\s*\(Stadt\)/i, '').replace(/\s*\(Land\)/i, '')
    .replace(/\s*i\.Br\.?$/i, '').replace(/-Zentrale$/i, '').replace(/-Stadt$/i, '')
    .replace(/ OT .+$/i, '').replace(/ - .+$/i, '')
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────

const dryRun = process.argv.includes('--dry-run');
const csvPath = path.join(process.cwd(), 'src', 'data', 'av1_2026_04_csv.csv');
const citiesPath = path.join(process.cwd(), 'src', 'data', 'cities.json');

// Read existing cities
const existing: { name: string; slug: string; state: string; region: string }[] = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));
const existingSlugs = new Set(existing.map(c => c.slug));

console.log(`📂 Current cities: ${existing.length}`);
console.log(`📄 CSV source: ${csvPath}`);

// Parse CSV
const raw = fs.readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());
const rows: CSVRow[] = [];
for (let i = 1; i < lines.length; i++) {
  const f = parseCSVLine(lines[i]);
  if (f.length < 9) continue;
  rows.push({
    code: f[0], stadt: f[1], bundesland: f[2], behoerdeName: f[3],
    plz: f[4], ort: f[5], strasse: f[6], telefon: f[7], email: f[8],
  });
}

// Filter main offices only (no Nebenstelle)
const mainOffices = rows.filter(r => !/\-e\d*$/.test(r.code));
console.log(`🏛️  Main offices in CSV: ${mainOffices.length}`);

// De-duplicate by cleaned city name → pick first main office per city
const cityMap = new Map<string, CSVRow>();
for (const row of mainOffices) {
  const cleaned = cleanCityName(row.stadt);
  const slug = slugify(cleaned);
  if (!cityMap.has(slug)) {
    cityMap.set(slug, row);
  }
}

console.log(`🏙️  Unique cities in CSV: ${cityMap.size}`);

// Build expanded list
const newCities: { name: string; slug: string; state: string; region: string }[] = [];
let added = 0;
let skipped = 0;

for (const [slug, row] of cityMap) {
  if (existingSlugs.has(slug)) {
    skipped++;
    continue;
  }

  const stateFull = BUNDESLAND_FULL[row.bundesland] || row.bundesland;
  const region = STATE_TO_REGION[stateFull] || stateFull;
  const name = cleanCityName(row.stadt);

  newCities.push({ name, slug, state: stateFull, region });
  added++;
}

// Sort new cities alphabetically
newCities.sort((a, b) => a.name.localeCompare(b.name, 'de'));

// Merge: existing first (preserve order), then new alphabetically
const merged = [...existing, ...newCities];

console.log(`\n✅ Summary:`);
console.log(`   Existing: ${existing.length}`);
console.log(`   Skipped (already exist): ${skipped}`);
console.log(`   New: ${added}`);
console.log(`   Total: ${merged.length}`);

if (dryRun) {
  console.log(`\n🔍 DRY RUN — No changes written.`);
  console.log(`\nNew cities that would be added:`);
  newCities.forEach(c => console.log(`   ${c.name} (${c.slug}) — ${c.state}, ${c.region}`));
} else {
  fs.writeFileSync(citiesPath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`\n💾 Written to ${citiesPath}`);
}
