import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized, requireRole, forbiddenResponse } from '@/lib/auth';
import { blogPostCreateSchema, blogPostUpdateSchema } from '@/lib/validations';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

function revalidateBlog(slug?: string) {
  if (slug) revalidatePath(`/${slug}`);
  revalidatePath('/insiderwissen');
  revalidatePath('/sitemap.xml');
  revalidateTag('blog');
  revalidateTag('blog-posts');
  revalidateTag('blog-categories');
}

// GET /api/admin/blog — List blog posts
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30')));
  const search = searchParams.get('search') || '';

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { slug: { contains: search } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        id: true, title: true, slug: true, status: true, category: true,
        featuredImage: true, featuredImageId: true, views: true,
        publishedAt: true, scheduledAt: true, createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json(
    { posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    { headers: { 'Cache-Control': 'private, max-age=5, stale-while-revalidate=30' } }
  );
}

// POST /api/admin/blog — Create blog post
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const parsed = blogPostCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Ungültige Eingabe' }, { status: 400 });
    }
    const data = parsed.data;

    // Check slug uniqueness
    const existing = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json({ error: 'Slug existiert bereits' }, { status: 409 });
    }

    // Handle scheduling
    let publishedAt: Date | null = null;
    let scheduledAt: Date | null = null;
    let finalStatus = data.status || 'draft';

    if (data.status === 'publish') {
      publishedAt = new Date();
    } else if (data.status === 'scheduled' && data.scheduledAt) {
      const schedDate = new Date(data.scheduledAt);
      if (schedDate <= new Date()) {
        // Past or now — publish immediately
        publishedAt = new Date();
        finalStatus = 'publish';
      } else {
        scheduledAt = schedDate;
        finalStatus = 'scheduled';
      }
    }

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content || '',
        excerpt: data.excerpt || '',
        status: finalStatus,
        category: data.category || '',
        tags: data.tags || '',
        featuredImage: data.featuredImage || '',
        featuredImageId: data.featuredImageId || '',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        focusKeyword: data.focusKeyword || '',
        canonical: data.canonical || '',
        ogTitle: data.ogTitle || '',
        ogDescription: data.ogDescription || '',
        publishedAt,
        scheduledAt,
      },
    });

    revalidateBlog(data.slug);

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error('Create blog post error:', error);
    return NextResponse.json({ error: error?.message || 'Server-Fehler' }, { status: 500 });
  }
}
