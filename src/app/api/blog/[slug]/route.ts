import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/blog/[slug] - Get a single published blog post
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!post || post.status !== 'publish') {
    return NextResponse.json({ error: 'Beitrag nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      id: post.id, slug: post.slug, title: post.title,
      content: post.content, excerpt: post.excerpt,
      featuredImage: post.featuredImage, author: post.author,
      category: post.category, tags: post.tags,
      publishedAt: post.publishedAt,
      seo: {
        metaTitle: post.metaTitle,
        metaDescription: post.metaDescription,
        ogImage: post.ogImage,
        ogTitle: post.ogTitle,
        ogDescription: post.ogDescription,
      },
    },
  });
}
