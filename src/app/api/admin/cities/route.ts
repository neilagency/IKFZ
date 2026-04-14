import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { invalidateCitiesCache } from '@/data/cities';

// ── Helpers ──────────────────────────────────────────────────────

function getCitiesFilePath(): string {
  return process.env.CITIES_DATA_PATH
    || path.join(process.cwd(), 'src', 'data', 'cities.json');
}

interface CityEntry {
  name: string;
  slug: string;
  state: string;
  region: string;
}

function readCities(): CityEntry[] {
  const filePath = getCitiesFilePath();
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeCities(cities: CityEntry[]): void {
  const filePath = getCitiesFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(cities, null, 2), 'utf-8');
  invalidateCitiesCache();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── GET: List all cities ─────────────────────────────────────────

export async function GET() {
  const cities = readCities();
  return NextResponse.json({ cities, total: cities.length });
}

// ── POST: Add a new city ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug: providedSlug, state, region } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name ist erforderlich (min. 2 Zeichen).' }, { status: 400 });
    }
    if (!state || typeof state !== 'string') {
      return NextResponse.json({ error: 'Bundesland ist erforderlich.' }, { status: 400 });
    }

    const slug = providedSlug ? String(providedSlug).toLowerCase().trim() : slugify(name.trim());

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json({ error: 'Ungültiges Slug-Format. Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt.' }, { status: 400 });
    }

    const cities = readCities();

    if (cities.some(c => c.slug === slug)) {
      return NextResponse.json({ error: `Slug "${slug}" existiert bereits.` }, { status: 409 });
    }

    const newCity: CityEntry = {
      name: name.trim(),
      slug,
      state: state.trim(),
      region: (region || state).trim(),
    };

    cities.push(newCity);
    cities.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    writeCities(cities);

    return NextResponse.json({ city: newCity, message: 'Stadt erfolgreich hinzugefügt.' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }
}

// ── PUT: Update a city ───────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalSlug, name, slug: newSlug, state, region } = body;

    if (!originalSlug || typeof originalSlug !== 'string') {
      return NextResponse.json({ error: 'originalSlug ist erforderlich.' }, { status: 400 });
    }

    const cities = readCities();
    const idx = cities.findIndex(c => c.slug === originalSlug);
    if (idx === -1) {
      return NextResponse.json({ error: `Stadt mit Slug "${originalSlug}" nicht gefunden.` }, { status: 404 });
    }

    const slug = newSlug ? String(newSlug).toLowerCase().trim() : originalSlug;

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json({ error: 'Ungültiges Slug-Format.' }, { status: 400 });
    }

    // Check slug uniqueness if changed
    if (slug !== originalSlug && cities.some(c => c.slug === slug)) {
      return NextResponse.json({ error: `Slug "${slug}" existiert bereits.` }, { status: 409 });
    }

    cities[idx] = {
      name: (name || cities[idx].name).trim(),
      slug,
      state: (state || cities[idx].state).trim(),
      region: (region || cities[idx].region).trim(),
    };

    cities.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    writeCities(cities);

    return NextResponse.json({ city: cities.find(c => c.slug === slug), message: 'Stadt aktualisiert.' });
  } catch (e) {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }
}

// ── DELETE: Remove a city ────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Slug Parameter fehlt.' }, { status: 400 });
    }

    const cities = readCities();
    const filtered = cities.filter(c => c.slug !== slug);

    if (filtered.length === cities.length) {
      return NextResponse.json({ error: `Stadt mit Slug "${slug}" nicht gefunden.` }, { status: 404 });
    }

    writeCities(filtered);

    return NextResponse.json({ message: `Stadt "${slug}" gelöscht.`, remaining: filtered.length });
  } catch (e) {
    return NextResponse.json({ error: 'Fehler beim Löschen.' }, { status: 500 });
  }
}
