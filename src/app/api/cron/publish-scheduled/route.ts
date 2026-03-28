import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const scheduledPosts = await prisma.blogPost.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    });

    if (scheduledPosts.length === 0) {
      return NextResponse.json({ published: 0, posts: [] });
    }

    await prisma.$transaction(
      scheduledPosts.map((post) =>
        prisma.blogPost.update({
          where: { id: post.id },
          data: { status: 'publish', publishedAt: now, scheduledAt: null },
        })
      )
    );

    for (const post of scheduledPosts) {
      revalidatePath(`/${post.slug}`);
    }
    revalidatePath('/insiderwissen');
    revalidatePath('/sitemap.xml');
    revalidateTag('blog');
    revalidateTag('blog-posts');

    return NextResponse.json({
      published: scheduledPosts.length,
      posts: scheduledPosts.map(({ id, slug, title }) => ({ id, slug, title })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

// POST kept for backwards-compat — delegates to GET logic
export async function POST(req: NextRequest) {
  return GET(req);
}
