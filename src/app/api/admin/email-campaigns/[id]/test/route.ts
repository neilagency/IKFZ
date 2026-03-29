import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildCampaignHtml, personalizeHtml, sendCampaignEmail } from '@/lib/campaign-email';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** POST /api/admin/email-campaigns/[id]/test – send test email */
export async function POST(request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Gültige E-Mail-Adresse ist erforderlich' },
        { status: 400 }
      );
    }

    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 });
    }

    if (!campaign.subject || !campaign.heading || !campaign.content) {
      return NextResponse.json(
        { error: 'Betreff, Überschrift und Inhalt sind erforderlich' },
        { status: 400 }
      );
    }

    const html = buildCampaignHtml({
      subject: campaign.subject,
      heading: campaign.heading,
      content: campaign.content,
      imageUrl: campaign.imageUrl || undefined,
      ctaText: campaign.ctaText || undefined,
      ctaUrl: campaign.ctaUrl || undefined,
      campaignId: campaign.id,
    });

    const personalizedHtml = personalizeHtml(html, 'test-preview');

    const result = await sendCampaignEmail({
      to: email,
      subject: `[TEST] ${campaign.subject}`,
      html: personalizedHtml,
    });

    if (result.success) {
      return NextResponse.json({ success: true, message: `Test-E-Mail an ${email} gesendet` });
    } else {
      return NextResponse.json(
        { error: `Senden fehlgeschlagen: ${result.error}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
