import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

// GET /api/admin/seo - List SEO records with pagination
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const search = searchParams.get('search') || '';

  const where: any = search ? {
    OR: [
      { metaTitle: { contains: search } },
      { page: { title: { contains: search } } },
      { page: { slug: { contains: search } } },
    ],
  } : {};

  const [seo, total] = await Promise.all([
    prisma.sEO.findMany({
      where,
      include: { page: { select: { title: true, slug: true } } },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sEO.count({ where }),
  ]);

  return NextResponse.json({ seo, total, page, totalPages: Math.ceil(total / limit) });
}

// PUT /api/admin/seo - Update an SEO record
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { id, metaTitle, metaDescription, canonicalUrl, ogTitle, ogDescription, ogImage, ogType, twitterCard, twitterTitle, twitterDesc, twitterImage, robots, schemaJson } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
    }

    const seo = await prisma.sEO.update({
      where: { id },
      data: {
        ...(metaTitle !== undefined ? { metaTitle } : {}),
        ...(metaDescription !== undefined ? { metaDescription } : {}),
        ...(canonicalUrl !== undefined ? { canonicalUrl } : {}),
        ...(ogTitle !== undefined ? { ogTitle } : {}),
        ...(ogDescription !== undefined ? { ogDescription } : {}),
        ...(ogImage !== undefined ? { ogImage } : {}),
        ...(ogType !== undefined ? { ogType } : {}),
        ...(twitterCard !== undefined ? { twitterCard } : {}),
        ...(twitterTitle !== undefined ? { twitterTitle } : {}),
        ...(twitterDesc !== undefined ? { twitterDesc } : {}),
        ...(twitterImage !== undefined ? { twitterImage } : {}),
        ...(robots !== undefined ? { robots } : {}),
        ...(schemaJson !== undefined ? { schemaJson } : {}),
      },
    });

    return NextResponse.json({ seo });
  } catch (error) {
    console.error('Update SEO error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
