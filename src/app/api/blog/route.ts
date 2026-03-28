import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/blog - List published blog posts with pagination
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '9', 10)));
  const category = sp.get('category') || undefined;
  const search = sp.get('search') || undefined;

  const where: any = { status: 'publish' };

  if (category) {
    where.category = { contains: category };
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
    ];
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, title: true, excerpt: true,
        featuredImage: true, author: true, publishedAt: true, category: true, tags: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({ posts, pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } });
}
