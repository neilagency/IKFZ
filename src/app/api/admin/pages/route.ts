import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized, requireRole, forbiddenResponse } from '@/lib/auth';

// GET /api/admin/pages - List pages with pagination
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const pageType = searchParams.get('pageType') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const search = searchParams.get('search') || '';

  const where: any = {
    ...(status ? { status } : {}),
    ...(pageType ? { pageType } : {}),
    ...(search ? { title: { contains: search } } : {}),
  };

  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      include: { seo: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.page.count({ where }),
  ]);

  return NextResponse.json({ pages, total, page, totalPages: Math.ceil(total / limit) });
}

// POST /api/admin/pages - Create a new page
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { title, slug, content, excerpt, status, pageType, featuredImage, seo } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Titel und Slug erforderlich' }, { status: 400 });
    }

    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
    }

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        content: content || '',
        excerpt: excerpt || '',
        status: status || 'draft',
        pageType: pageType || 'generic',
        featuredImage: featuredImage || null,
        ...(seo ? {
          seo: {
            create: {
              metaTitle: seo.metaTitle || title,
              metaDescription: seo.metaDescription || excerpt || '',
              canonicalUrl: seo.canonicalUrl || `https://ikfzdigitalzulassung.de/${slug}/`,
              ogTitle: seo.ogTitle || null,
              ogDescription: seo.ogDescription || null,
              ogImage: seo.ogImage || null,
              ogType: seo.ogType || 'website',
              twitterCard: seo.twitterCard || 'summary_large_image',
              twitterTitle: seo.twitterTitle || null,
              twitterDesc: seo.twitterDesc || null,
              twitterImage: seo.twitterImage || null,
              robots: seo.robots || null,
              schemaJson: seo.schemaJson || null,
            },
          },
        } : {}),
      },
      include: { seo: true },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error('Create page error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

// PUT /api/admin/pages - Update a page
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { id, title, slug, content, excerpt, status, pageType, featuredImage, seo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
    }

    // Check slug uniqueness if slug changed
    if (slug) {
      const existing = await prisma.page.findFirst({ where: { slug, id: { not: id } } });
      if (existing) {
        return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
      }
    }

    const page = await prisma.page.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(pageType !== undefined ? { pageType } : {}),
        ...(featuredImage !== undefined ? { featuredImage } : {}),
      },
      include: { seo: true },
    });

    if (seo && page.seo) {
      await prisma.sEO.update({
        where: { id: page.seo.id },
        data: {
          ...(seo.metaTitle !== undefined ? { metaTitle: seo.metaTitle } : {}),
          ...(seo.metaDescription !== undefined ? { metaDescription: seo.metaDescription } : {}),
          ...(seo.canonicalUrl !== undefined ? { canonicalUrl: seo.canonicalUrl } : {}),
          ...(seo.ogTitle !== undefined ? { ogTitle: seo.ogTitle } : {}),
          ...(seo.ogDescription !== undefined ? { ogDescription: seo.ogDescription } : {}),
          ...(seo.ogImage !== undefined ? { ogImage: seo.ogImage } : {}),
          ...(seo.ogType !== undefined ? { ogType: seo.ogType } : {}),
          ...(seo.twitterCard !== undefined ? { twitterCard: seo.twitterCard } : {}),
          ...(seo.twitterTitle !== undefined ? { twitterTitle: seo.twitterTitle } : {}),
          ...(seo.twitterDesc !== undefined ? { twitterDesc: seo.twitterDesc } : {}),
          ...(seo.twitterImage !== undefined ? { twitterImage: seo.twitterImage } : {}),
          ...(seo.robots !== undefined ? { robots: seo.robots } : {}),
          ...(seo.schemaJson !== undefined ? { schemaJson: seo.schemaJson } : {}),
        },
      });
    }

    const updated = await prisma.page.findUnique({ where: { id }, include: { seo: true } });
    return NextResponse.json({ page: updated });
  } catch (error) {
    console.error('Update page error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

// DELETE /api/admin/pages?id=X - Delete a page (admin only)
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
  }

  try {
    await prisma.sEO.deleteMany({ where: { pageId: id } });
    await prisma.page.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete page error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
