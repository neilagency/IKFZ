/**
 * CSV Parser & Fuzzy Matching Engine
 * 
 * Parses the official KBA vehicle registration authority CSV
 * and provides fuzzy lookup for city → authority matching.
 */

import fs from 'fs';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────

export interface CSVAuthority {
  code: string;
  csvCity: string;        // Original city name from CSV
  bundesland: string;     // 2-letter state code
  bundeslandFull: string; // Full state name
  name: string;           // Authority name (behoerde_name)
  plz: string;
  ort: string;
  street: string;
  phone: string;
  email: string;
  isNebenstelle: boolean; // Branch office flag
}

export interface FuzzyMatch {
  authority: CSVAuthority;
  score: number;
  matchType: 'exact' | 'normalized' | 'contains' | 'partial' | 'fuzzy';
}

// ── Bundesland Mapping ───────────────────────────────────────────

const BUNDESLAND_MAP: Record<string, string> = {
  'BB': 'Brandenburg',
  'BE': 'Berlin',
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'HB': 'Bremen',
  'HE': 'Hessen',
  'HH': 'Hamburg',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SH': 'Schleswig-Holstein',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'TH': 'Thüringen',
};

// ── CSV Parsing ──────────────────────────────────────────────────

let _csvCache: CSVAuthority[] | null = null;

function getCSVPath(): string {
  return path.join(process.cwd(), 'src', 'data', 'av1_2026_04_csv.csv');
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCSV(): CSVAuthority[] {
  if (_csvCache) return _csvCache;

  const csvPath = getCSVPath();
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim().length > 0);

  // Skip header
  const entries: CSVAuthority[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 9) continue;

    const [code, stadt, bundesland, behoerdeName, plz, ort, strasse, telefon, email] = fields;
    const isNebenstelle = /\-e\d*$/.test(code) || /\-e\d*,/.test(code);

    entries.push({
      code,
      csvCity: stadt,
      bundesland,
      bundeslandFull: BUNDESLAND_MAP[bundesland] || bundesland,
      name: behoerdeName,
      plz,
      ort,
      street: strasse,
      phone: telefon,
      email: email || '',
      isNebenstelle,
    });
  }

  _csvCache = entries;
  return entries;
}

export function invalidateCSVCache(): void {
  _csvCache = null;
}

// ── German Text Normalization ────────────────────────────────────

export function normalizeGerman(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Strips common suffixes/qualifiers from CSV city names:
 * "Berlin-Tempelhof" → "Berlin"
 * "München(Stadt)" → "München"
 * "Dresden (Stadt)" → "Dresden"
 * "Freiburg i.Br." → "Freiburg"
 * "Erfurt(Stadt)" → "Erfurt"
 * "Bremen-Stadt" → "Bremen"
 * "Augsburg-Zentrale" → "Augsburg"
 */
function stripCityQualifier(csvCity: string): string {
  return csvCity
    .replace(/\s*\(Stadt\)/i, '')
    .replace(/\s*\(Land\)/i, '')
    .replace(/\s*i\.Br\.?$/i, '')
    .replace(/-Zentrale$/i, '')
    .replace(/-Stadt$/i, '')
    .replace(/-Tempelhof$/i, '')
    .replace(/-Hohenschönhausen$/i, '')
    .replace(/ OT .+$/i, '')
    .replace(/ - .+$/i, '')
    .trim();
}

// ── Fuzzy Matching ───────────────────────────────────────────────

/**
 * Finds the best matching authority for a city name/slug.
 * 
 * Scoring system:
 *   100 = Exact match (normalized city name matches CSV city)
 *    90 = Stripped qualifier match (e.g. "München(Stadt)" → "München")
 *    80 = Contains match (CSV city contains search term or vice versa)
 *    70 = Authority name contains city
 *    60 = ort (location) field matches
 *    50 = Partial normalized overlap
 * 
 * Main offices (non-Nebenstelle) are preferred over branch offices.
 * "Stadt" entries are preferred over "Land" entries.
 */
export function fuzzyMatchAuthority(
  cityName: string,
  citySlug?: string,
): FuzzyMatch | null {
  const entries = parseCSV();
  const normalizedSearch = normalizeGerman(cityName);
  const normalizedSlug = citySlug ? normalizeGerman(citySlug) : normalizedSearch;

  const matches: FuzzyMatch[] = [];

  for (const entry of entries) {
    const normalizedCSV = normalizeGerman(entry.csvCity);
    const normalizedStripped = normalizeGerman(stripCityQualifier(entry.csvCity));
    const normalizedOrt = normalizeGerman(entry.ort);
    const normalizedAuthName = normalizeGerman(entry.name);

    let score = 0;
    let matchType: FuzzyMatch['matchType'] = 'fuzzy';

    // Exact normalized match
    if (normalizedCSV === normalizedSearch || normalizedCSV === normalizedSlug) {
      score = 100;
      matchType = 'exact';
    }
    // Stripped qualifier match
    else if (normalizedStripped === normalizedSearch || normalizedStripped === normalizedSlug) {
      score = 90;
      matchType = 'normalized';
    }
    // Ort field exact match (e.g. "Grasbrunn-Neukeferloh" has ort="Grasbrunn-Neukeferloh" but for München it has ort that may differ)
    else if (normalizedOrt === normalizedSearch || normalizedOrt === normalizedSlug) {
      score = 85;
      matchType = 'normalized';
    }
    // CSV city starts with search term (e.g. "Augsburg-Zentrale" starts with "Augsburg")
    else if (normalizedCSV.startsWith(normalizedSearch) || normalizedCSV.startsWith(normalizedSlug)) {
      score = 80;
      matchType = 'contains';
    }
    // Search term contains CSV stripped name
    else if (normalizedSearch.includes(normalizedStripped) && normalizedStripped.length >= 4) {
      score = 75;
      matchType = 'contains';
    }
    // Authority name contains city name (e.g. "Stadt München" for "München")
    else if (normalizedAuthName.includes(normalizedSearch) && normalizedSearch.length >= 4) {
      score = 70;
      matchType = 'partial';
    }
    // Ort contains search or vice versa
    else if (
      (normalizedOrt.includes(normalizedSearch) && normalizedSearch.length >= 4) ||
      (normalizedSearch.includes(normalizedOrt) && normalizedOrt.length >= 4)
    ) {
      score = 60;
      matchType = 'partial';
    }

    if (score > 0) {
      // Boost main offices, penalize Nebenstellen
      if (entry.isNebenstelle) score -= 5;

      // Strongly prefer "Stadt" entries over "Land" (LK/LRA) for city pages
      if (entry.name.startsWith('Stadt ')) score += 8;
      if (entry.name.startsWith('LRA ') || entry.name.startsWith('LK ')) score -= 5;

      matches.push({ authority: entry, score, matchType });
    }
  }

  if (matches.length === 0) return null;

  // Sort by score desc, then prefer main offices
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: prefer non-Nebenstelle
    if (a.authority.isNebenstelle !== b.authority.isNebenstelle) {
      return a.authority.isNebenstelle ? 1 : -1;
    }
    return 0;
  });

  return matches[0];
}

/**
 * Returns all matching authorities for a city (main + branches).
 */
export function findAllAuthorities(cityName: string): CSVAuthority[] {
  const entries = parseCSV();
  const normalizedSearch = normalizeGerman(cityName);

  return entries.filter(entry => {
    const normalizedCSV = normalizeGerman(entry.csvCity);
    const normalizedStripped = normalizeGerman(stripCityQualifier(entry.csvCity));
    const normalizedOrt = normalizeGerman(entry.ort);
    const normalizedAuthName = normalizeGerman(entry.name);

    return (
      normalizedCSV === normalizedSearch ||
      normalizedStripped === normalizedSearch ||
      normalizedCSV.startsWith(normalizedSearch) ||
      normalizedOrt === normalizedSearch ||
      (normalizedAuthName.includes(normalizedSearch) && normalizedSearch.length >= 4)
    );
  });
}

/**
 * Gets all unique cities from CSV (main offices only, deduplicated).
 */
export function getAllCSVCities(): CSVAuthority[] {
  const entries = parseCSV();
  // Prefer main offices
  return entries.filter(e => !e.isNebenstelle);
}

/**
 * Gets CSV stats for reporting.
 */
export function getCSVStats() {
  const entries = parseCSV();
  const mainOffices = entries.filter(e => !e.isNebenstelle);
  const branches = entries.filter(e => e.isNebenstelle);
  const states = new Set(entries.map(e => e.bundesland));

  return {
    total: entries.length,
    mainOffices: mainOffices.length,
    branches: branches.length,
    states: states.size,
    stateList: Array.from(states).sort(),
  };
}
