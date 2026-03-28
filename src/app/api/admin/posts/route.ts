import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized, requireRole, forbiddenResponse } from '@/lib/auth';

// GET /api/admin/posts - List posts with pagination
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const search = searchParams.get('search') || '';

  const where: any = {
    ...(status ? { status } : {}),
    ...(search ? { title: { contains: search } } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        seo: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, totalPages: Math.ceil(total / limit) });
}

// POST /api/admin/posts - Create a new post
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { title, slug, content, excerpt, status, author, featuredImage, readingTime, categoryIds, seo, scheduledAt } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Titel und Slug erforderlich' }, { status: 400 });
    }

    const existing = await prisma.post.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
    }

    // Determine publishedAt and scheduledAt based on status
    let postPublishedAt: Date | null = null;
    let postScheduledAt: Date | null = null;

    if (status === 'published') {
      postPublishedAt = new Date();
    } else if (status === 'scheduled' && scheduledAt) {
      postScheduledAt = new Date(scheduledAt);
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: content || '',
        excerpt: excerpt || '',
        status: status || 'draft',
        author: author || null,
        featuredImage: featuredImage || null,
        readingTime: readingTime || null,
        publishedAt: postPublishedAt,
        scheduledAt: postScheduledAt,
        ...(categoryIds?.length ? {
          categories: {
            create: categoryIds.map((catId: string) => ({ categoryId: catId })),
          },
        } : {}),
        ...(seo ? {
          seo: {
            create: {
              metaTitle: seo.metaTitle || title,
              metaDescription: seo.metaDescription || excerpt || '',
              canonicalUrl: seo.canonicalUrl || `https://ikfzdigitalzulassung.de/${slug}/`,
              ogTitle: seo.ogTitle || null,
              ogDescription: seo.ogDescription || null,
              ogImage: seo.ogImage || null,
              ogType: 'article',
              twitterCard: seo.twitterCard || 'summary_large_image',
              twitterTitle: seo.twitterTitle || null,
              twitterDesc: seo.twitterDesc || null,
              twitterImage: seo.twitterImage || null,
              robots: seo.robots || null,
              schemaJson: seo.schemaJson || null,
            },
          },
        } : {
          seo: {
            create: {
              metaTitle: title,
              metaDescription: excerpt || '',
              canonicalUrl: `https://ikfzdigitalzulassung.de/${slug}/`,
              ogType: 'article',
              twitterCard: 'summary_large_image',
            },
          },
        }),
      },
      include: { seo: true, categories: { include: { category: true } } },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: error?.message || 'Server-Fehler' }, { status: 500 });
  }
}

// PUT /api/admin/posts - Update a post
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { id, title, slug, content, excerpt, status, author, featuredImage, readingTime, seo, scheduledAt } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
    }

    // Check slug uniqueness if slug changed
    if (slug) {
      const existing = await prisma.post.findFirst({ where: { slug, id: { not: id } } });
      if (existing) {
        return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (author !== undefined) updateData.author = author;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (readingTime !== undefined) updateData.readingTime = readingTime;

    // Handle status transitions
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published') {
        // Get existing post to check if it has publishedAt
        const existing = await prisma.post.findUnique({ where: { id } });
        updateData.publishedAt = existing?.publishedAt || new Date();
        updateData.scheduledAt = null;
      } else if (status === 'scheduled' && scheduledAt) {
        updateData.scheduledAt = new Date(scheduledAt);
        updateData.publishedAt = null;
      } else if (status === 'draft') {
        updateData.scheduledAt = null;
      }
    }

    const post = await prisma.post.update({
      where: { id },
      data: updateData,
      include: { seo: true },
    });

    // Handle SEO update or create
    if (seo) {
      if (post.seo) {
        await prisma.sEO.update({
          where: { id: post.seo.id },
          data: {
            ...(seo.metaTitle !== undefined ? { metaTitle: seo.metaTitle } : {}),
            ...(seo.metaDescription !== undefined ? { metaDescription: seo.metaDescription } : {}),
            ...(seo.canonicalUrl !== undefined ? { canonicalUrl: seo.canonicalUrl } : {}),
            ...(seo.ogTitle !== undefined ? { ogTitle: seo.ogTitle } : {}),
            ...(seo.ogDescription !== undefined ? { ogDescription: seo.ogDescription } : {}),
            ...(seo.ogImage !== undefined ? { ogImage: seo.ogImage } : {}),
            ...(seo.robots !== undefined ? { robots: seo.robots } : {}),
            ...(seo.schemaJson !== undefined ? { schemaJson: seo.schemaJson } : {}),
          },
        });
      } else {
        await prisma.sEO.create({
          data: {
            postId: id,
            metaTitle: seo.metaTitle || title || '',
            metaDescription: seo.metaDescription || excerpt || '',
            canonicalUrl: seo.canonicalUrl || `https://ikfzdigitalzulassung.de/${slug || post.slug}/`,
            ogTitle: seo.ogTitle || null,
            ogDescription: seo.ogDescription || null,
            ogImage: seo.ogImage || null,
            ogType: 'article',
            twitterCard: 'summary_large_image',
          },
        });
      }
    }

    const updated = await prisma.post.findUnique({ where: { id }, include: { seo: true, categories: { include: { category: true } } } });
    return NextResponse.json({ post: updated });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

// DELETE /api/admin/posts?id=X - Delete a post (admin only)
export async function DELETE(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();
  if (!requireRole(user, 'admin')) return forbiddenResponse();

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ID erforderlich' }, { status: 400 });
  }

  try {
    await prisma.sEO.deleteMany({ where: { postId: id } });
    await prisma.postCategory.deleteMany({ where: { postId: id } });
    await prisma.postTag.deleteMany({ where: { postId: id } });
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}
