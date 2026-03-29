import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://ikfzdigitalzulassung.de';

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/track/click/[id]?url=... – click tracking redirect */
export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const targetUrl = request.nextUrl.searchParams.get('url') || '';

  // Validate URL – only allow http/https
  let redirectTo = SITE_URL;
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      redirectTo = targetUrl;
    }
  } catch {
    // Invalid URL, fall back to site URL
  }

  // Increment click count in background
  prisma.emailCampaign
    .update({
      where: { id },
      data: { clickCount: { increment: 1 } },
    })
    .catch(() => {
      // Silently ignore – campaign may not exist
    });

  return NextResponse.redirect(redirectTo, 302);
}
