import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { invalidateOverridesCache, getOverrides, type AuthorityOverride } from '@/data/cities';

function getOverridesPath(): string {
  return process.env.OVERRIDES_DATA_PATH
    || path.join(process.cwd(), 'src', 'data', 'authorityOverrides.json');
}

// ── GET: Return all overrides ────────────────────────────────────

export async function GET() {
  const overrides = getOverrides();
  return NextResponse.json({ overrides });
}

// ── PUT: Update override for a single city ───────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, website, hours, notes } = body;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Slug ist erforderlich.' }, { status: 400 });
    }

    // Validate URL if provided
    if (website && typeof website === 'string' && website.trim()) {
      try {
        new URL(website.trim());
      } catch {
        return NextResponse.json({ error: 'Ungültige Website-URL.' }, { status: 400 });
      }
    }

    const filePath = getOverridesPath();
    let data: Record<string, any> = {};

    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    const override: AuthorityOverride = {};
    if (website !== undefined) override.website = String(website).trim();
    if (hours !== undefined) override.hours = String(hours).trim();
    if (notes !== undefined) override.notes = String(notes).trim();

    // Clean empty overrides
    if (!override.website && !override.hours && !override.notes) {
      delete data[slug];
    } else {
      data[slug] = override;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    invalidateOverridesCache();

    return NextResponse.json({ success: true, slug, override: data[slug] || null });
  } catch (err) {
    return NextResponse.json({ error: 'Fehler beim Speichern.' }, { status: 500 });
  }
}
