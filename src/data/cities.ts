import citiesData from './cities.json';
import defaultOverrides from './authorityOverrides.json';
import fs from 'fs';
import path from 'path';
import { fuzzyMatchAuthority, findAllAuthorities, type CSVAuthority } from '@/lib/csvParser';

// ── Authority Override Types ─────────────────────────────────────

export interface AuthorityOverride {
  website?: string;
  hours?: string;
  notes?: string;
}

export type OverridesMap = Record<string, AuthorityOverride>;

// ═══════════════════════════════════════════════════════════════════
//  SAFETY GUARD: City data is 100% CSV + Registry.
//  NO Prisma / DB imports allowed in this module.
//  Authority data comes exclusively from av1_2026_04_csv.csv
//  City routing comes exclusively from cities.json
// ═══════════════════════════════════════════════════════════════════

// ── Types ────────────────────────────────────────────────────────

export interface CityEntry {
  name: string;
  slug: string;
  state: string;
  region: string;
}

export interface AuthorityData {
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  code: string;
  bundesland: string;
  isNebenstelle: boolean;
  branches: BranchOffice[];
}

export interface BranchOffice {
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
}

// ── Runtime data path ────────────────────────────────────────────
// In production, the admin panel writes to a runtime file.
// At build time or if no runtime file exists, we use the static import.

function getCitiesDataPath(): string {
  return process.env.CITIES_DATA_PATH
    || path.join(process.cwd(), 'src', 'data', 'cities.json');
}

// ── City registry (reads fresh data at runtime) ─────────────────

let _citiesCache: CityEntry[] | null = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

export function getCities(): CityEntry[] {
  const now = Date.now();
  if (_citiesCache && (now - _cacheTimestamp) < CACHE_TTL) {
    return _citiesCache;
  }

  try {
    const filePath = getCitiesDataPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      _citiesCache = JSON.parse(raw) as CityEntry[];
      _cacheTimestamp = now;
      return _citiesCache;
    }
  } catch {
    // Fall back to static import
  }

  _citiesCache = citiesData as CityEntry[];
  _cacheTimestamp = now;
  return _citiesCache;
}

export function invalidateCitiesCache(): void {
  _citiesCache = null;
  _cacheTimestamp = 0;
}

// ── Lookup helpers ───────────────────────────────────────────────

export function getCityBySlug(slug: string): CityEntry | undefined {
  return getCities().find(c => c.slug === slug);
}

export function isCitySlug(slug: string): boolean {
  return getCities().some(c => c.slug === slug);
}

export function getCitySlugs(): string[] {
  return getCities().map(c => c.slug);
}

// ── Aliases (old URLs → new city slugs) ──────────────────────────
// Maps old WordPress-era slugs to the new canonical city slug.

const CITY_ALIASES: Record<string, string> = {
  // kfz-zulassung-{city}
  'kfz-zulassung-berlin': 'berlin',
  'kfz-zulassung-hamburg': 'hamburg',
  'kfz-zulassung-muenchen': 'muenchen',
  'kfz-zulassung-koeln': 'koeln',
  'kfz-zulassung-frankfurt': 'frankfurt',
  'kfz-zulassung-stuttgart': 'stuttgart',
  'kfz-zulassung-duesseldorf': 'duesseldorf',
  'kfz-zulassung-leipzig': 'leipzig',
  'kfz-zulassung-dortmund': 'dortmund',
  'kfz-zulassung-essen': 'essen',
  'kfz-zulassung-bremen': 'bremen',
  'kfz-zulassung-dresden': 'dresden',
  'kfz-zulassung-hannover': 'hannover',
  'kfz-zulassung-nuernberg': 'nuernberg',
  'kfz-zulassung-duisburg': 'duisburg',
  'kfz-zulassung-bochum': 'bochum',
  'kfz-zulassung-wuppertal': 'wuppertal',
  'kfz-zulassung-bielefeld': 'bielefeld',
  'kfz-zulassung-bonn': 'bonn',
  'kfz-zulassung-muenster': 'muenster',
  'kfz-zulassung-mannheim': 'mannheim',
  'kfz-zulassung-karlsruhe': 'karlsruhe',
  'kfz-zulassung-augsburg': 'augsburg',
  'kfz-zulassung-wiesbaden': 'wiesbaden',
  'kfz-zulassung-aachen': 'aachen',
  'kfz-zulassung-braunschweig': 'braunschweig',
  'kfz-zulassung-kiel': 'kiel',
  'kfz-zulassung-freiburg': 'freiburg',
  'kfz-zulassung-mainz': 'mainz',
  'kfz-zulassung-kassel': 'kassel',
  'kfz-zulassung-potsdam': 'potsdam',
  // zulassungsstelle-{city}
  'zulassungsstelle-hamburg': 'hamburg',
  'zulassungsstelle-berlin': 'berlin',
  'zulassungsstelle-muenchen': 'muenchen',
  'zulassungsstelle-koeln': 'koeln',
  // autoanmeldung-{city}
  'autoanmeldung-koeln': 'koeln',
  'autoanmeldung-berlin': 'berlin',
  'autoanmeldung-hamburg': 'hamburg',
  // auto-anmelden-{city}
  'auto-anmelden-berlin': 'berlin',
  'auto-anmelden-hamburg': 'hamburg',
  'auto-anmelden-muenchen': 'muenchen',
  // landkreis patterns
  'landkreis-esslingen': 'stuttgart',
  'landkreis-reutlingen': 'stuttgart',
  // in-{city}
  'in-berlin': 'berlin',
  'in-hamburg': 'hamburg',
  'in-muenchen': 'muenchen',
  // auto-online-anmelden-oder-abmelden patterns
  'auto-online-anmelden-oder-abmelden-im-landkreis-esslingen': 'stuttgart',
  'auto-online-anmelden-oder-abmelden-in-berlin': 'berlin',
};

export function resolveAlias(slug: string): string | null {
  return CITY_ALIASES[slug] || null;
}

export { CITY_ALIASES };

// ── Authority data (from CSV via fuzzy matching + JSON overrides) ──

const _authorityCache = new Map<string, { data: AuthorityData | null; timestamp: number }>();
const AUTHORITY_CACHE_TTL = 300_000; // 5 minutes

export function invalidateAuthorityCache(): void {
  _authorityCache.clear();
}

// ── Authority Overrides (website, hours, notes) ──────────────────

let _overridesCache: OverridesMap | null = null;
let _overridesTimestamp = 0;
const OVERRIDES_TTL = 30_000;

function getOverridesPath(): string {
  return process.env.OVERRIDES_DATA_PATH
    || path.join(process.cwd(), 'src', 'data', 'authorityOverrides.json');
}

export function getOverrides(): OverridesMap {
  const now = Date.now();
  if (_overridesCache && (now - _overridesTimestamp) < OVERRIDES_TTL) {
    return _overridesCache;
  }

  try {
    const filePath = getOverridesPath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      // Strip internal keys like _comment
      const { _comment, ...overrides } = parsed;
      _overridesCache = overrides as OverridesMap;
      _overridesTimestamp = now;
      return _overridesCache;
    }
  } catch {
    // Fall back to static import
  }

  const { _comment, ...overrides } = defaultOverrides as Record<string, any>;
  _overridesCache = overrides as OverridesMap;
  _overridesTimestamp = now;
  return _overridesCache;
}

export function invalidateOverridesCache(): void {
  _overridesCache = null;
  _overridesTimestamp = 0;
  // Authority data depends on overrides — clear authority cache too
  invalidateAuthorityCache();
}

function csvToAuthority(csv: CSVAuthority, cityName: string, citySlug?: string): AuthorityData {
  // Find branch offices for this city
  const allEntries = findAllAuthorities(cityName);
  const branches: BranchOffice[] = allEntries
    .filter(e => e.isNebenstelle && e.code !== csv.code)
    .map(e => ({
      name: e.name,
      street: e.street,
      zip: e.plz,
      city: e.ort,
      phone: e.phone,
      email: e.email,
    }));

  // Merge JSON overrides (website, hours, notes)
  const overrides = citySlug ? getOverrides()[citySlug] : undefined;

  // Clean authority name: strip "Nebenstelle" from main offices where
  // the code indicates a main office but the CSV name includes "Nebenstelle"
  let authorityName = csv.name;
  if (!csv.isNebenstelle && authorityName.includes('Nebenstelle')) {
    authorityName = authorityName.replace(/\s*Nebenstelle\s*/g, ' ').trim();
  }

  return {
    name: authorityName,
    street: csv.street,
    zip: csv.plz,
    city: csv.ort,
    phone: csv.phone,
    email: csv.email,
    website: overrides?.website || '',
    hours: overrides?.hours || '',
    code: csv.code,
    bundesland: csv.bundesland,
    isNebenstelle: csv.isNebenstelle,
    branches,
  };
}

export function getAuthority(citySlug: string): AuthorityData | undefined {
  const now = Date.now();
  const cached = _authorityCache.get(citySlug);
  if (cached && (now - cached.timestamp) < AUTHORITY_CACHE_TTL) {
    return cached.data ?? undefined;
  }

  const city = getCityBySlug(citySlug);
  if (!city) {
    _authorityCache.set(citySlug, { data: null, timestamp: now });
    return undefined;
  }

  const match = fuzzyMatchAuthority(city.name, citySlug);
  if (!match) {
    _authorityCache.set(citySlug, { data: null, timestamp: now });
    return undefined;
  }

  const authority = csvToAuthority(match.authority, city.name, citySlug);
  _authorityCache.set(citySlug, { data: authority, timestamp: now });
  return authority;
}

// Fuzzy match: find authority by city name substring
export function getAuthorityByCity(cityName: string): AuthorityData | undefined {
  const match = fuzzyMatchAuthority(cityName);
  if (!match) return undefined;
  return csvToAuthority(match.authority, cityName);
}

// ── Nearby cities ────────────────────────────────────────────────
// Computed from region: cities in the same region are "nearby"

export function getNearbyCities(citySlug: string, limit = 5): CityEntry[] {
  const city = getCityBySlug(citySlug);
  if (!city) return [];

  const cities = getCities();

  // Same region first, then same state
  const sameRegion = cities.filter(c => c.slug !== citySlug && c.region === city.region);
  const sameState = cities.filter(c => c.slug !== citySlug && c.state === city.state && c.region !== city.region);
  const result = [...sameRegion, ...sameState];

  // If not enough, add geographically close cities (by position in array for simplicity)
  if (result.length < limit) {
    const remaining = cities.filter(c => c.slug !== citySlug && !result.includes(c));
    result.push(...remaining.slice(0, limit - result.length));
  }

  return result.slice(0, limit);
}
