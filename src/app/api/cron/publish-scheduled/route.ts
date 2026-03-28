import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/cron/publish-scheduled
// Publishes all scheduled posts whose scheduledAt <= now
// Can be called by external cron service or internal scheduler
export async function POST(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'ikfz-cron-secret-2024';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all posts that are scheduled and due
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    });

    if (scheduledPosts.length === 0) {
      return NextResponse.json({ published: 0, message: 'Keine geplanten Beiträge fällig' });
    }

    // Publish each post
    const results = [];
    for (const post of scheduledPosts) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: post.scheduledAt || now,
          scheduledAt: null,
        },
      });
      results.push({ id: post.id, slug: post.slug, title: post.title });
    }

    console.log(`[CRON] Published ${results.length} scheduled posts:`, results.map(r => r.slug));

    return NextResponse.json({
      published: results.length,
      posts: results,
    });
  } catch (error) {
    console.error('[CRON] Publish scheduled error:', error);
    return NextResponse.json({ error: 'Server-Fehler' }, { status: 500 });
  }
}

// GET endpoint for health check
export async function GET() {
  const count = await prisma.post.count({
    where: { status: 'scheduled' },
  });

  return NextResponse.json({
    status: 'ok',
    scheduledCount: count,
  });
}
