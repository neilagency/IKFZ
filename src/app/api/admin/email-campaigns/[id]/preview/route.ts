import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildCampaignHtml } from '@/lib/campaign-email';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/admin/email-campaigns/[id]/preview – render campaign HTML preview */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return new NextResponse('Nicht gefunden', { status: 404 });
    }

    const html = buildCampaignHtml({
      subject: campaign.subject || 'Vorschau',
      heading: campaign.heading || 'Vorschau',
      content: campaign.content || '<p>Kein Inhalt</p>',
      imageUrl: campaign.imageUrl || undefined,
      ctaText: campaign.ctaText || undefined,
      ctaUrl: campaign.ctaUrl || undefined,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Preview campaign error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}
