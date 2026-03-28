import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/blog - List published blog posts with pagination
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '9', 10)));
  const category = sp.get('category') || undefined;
  const search = sp.get('search') || undefined;

  const where: any = { status: 'published' };

  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        categories: { include: { category: true } },
        seo: { select: { metaTitle: true, metaDescription: true, ogImage: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      featuredImage: p.featuredImage,
      author: p.author,
      readingTime: p.readingTime,
      publishedAt: p.publishedAt,
      categories: p.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
      })),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
