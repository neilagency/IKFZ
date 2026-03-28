import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/blog/[slug] - Get a single published blog post
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      seo: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!post || post.status !== 'published') {
    return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      author: post.author,
      readingTime: post.readingTime,
      publishedAt: post.publishedAt,
      categories: post.categories.map((c) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug,
      })),
      tags: post.tags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug,
      })),
      seo: post.seo
        ? {
            metaTitle: post.seo.metaTitle,
            metaDescription: post.seo.metaDescription,
            ogImage: post.seo.ogImage,
            ogTitle: post.seo.ogTitle,
            ogDescription: post.seo.ogDescription,
          }
        : null,
    },
  });
}
