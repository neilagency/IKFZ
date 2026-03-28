import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized, requireRole, forbiddenResponse } from '@/lib/auth';

// GET /api/admin/settings - List all settings
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const settings = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json({ settings });
}

// POST /api/admin/settings - Create or update a setting (admin only)
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  try {
    const { key, value } = await req.json();
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

    const setting = await prisma.siteSetting.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' },
    });
    return NextResponse.json(setting);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/settings - Bulk update settings (admin only)
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  try {
    const { settings } = await req.json();
    if (!Array.isArray(settings)) return NextResponse.json({ error: 'Settings array required' }, { status: 400 });

    const results = [];
    for (const { key, value } of settings) {
      if (!key) continue;
      const s = await prisma.siteSetting.upsert({
        where: { key },
        update: { value: value || '' },
        create: { key, value: value || '' },
      });
      results.push(s);
    }
    return NextResponse.json({ settings: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/settings - Delete a setting (admin only)
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 });

  try {
    await prisma.siteSetting.delete({ where: { key } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
