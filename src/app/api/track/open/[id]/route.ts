import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/track/open/[id] – tracking pixel */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  let { id } = await ctx.params;

  // Strip .png extension
  id = id.replace(/\.png$/, '');

  // Increment open count in background
  prisma.emailCampaign
    .update({
      where: { id },
      data: { openCount: { increment: 1 } },
    })
    .catch(() => {
      // Silently ignore – campaign may not exist
    });

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Length': String(PIXEL.length),
    },
  });
}
