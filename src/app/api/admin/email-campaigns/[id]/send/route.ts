import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildCampaignHtml, sendCampaignBatch } from '@/lib/campaign-email';
import { resolveRecipients } from '@/lib/campaign-recipients';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** POST /api/admin/email-campaigns/[id]/send – send campaign */
export async function POST(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
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

    if (campaign.status === 'sending') {
      return NextResponse.json(
        { error: 'Kampagne wird bereits gesendet' },
        { status: 400 }
      );
    }

    const recipients = await resolveRecipients({
      targetMode: campaign.targetMode,
      targetEmails: campaign.targetEmails,
      targetSegment: campaign.targetSegment,
    });

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'Keine Empfänger gefunden' },
        { status: 400 }
      );
    }

    // Mark as sending
    await prisma.emailCampaign.update({
      where: { id },
      data: {
        status: 'sending',
        sentCount: 0,
        failedCount: 0,
        totalRecipients: recipients.length,
        sentAt: new Date(),
      },
    });

    // Build HTML once (personalization happens per-recipient in sendCampaignBatch)
    const html = buildCampaignHtml({
      subject: campaign.subject,
      heading: campaign.heading,
      content: campaign.content,
      imageUrl: campaign.imageUrl || undefined,
      ctaText: campaign.ctaText || undefined,
      ctaUrl: campaign.ctaUrl || undefined,
      campaignId: campaign.id,
    });

    // Fire and forget – send in background
    sendCampaignBatch({
      campaignId: campaign.id,
      recipients,
      subject: campaign.subject,
      html,
      onProgress: async (sent, failed, errors) => {
        await prisma.emailCampaign.update({
          where: { id },
          data: {
            sentCount: sent,
            failedCount: failed,
            errorLog: errors.length > 0 ? errors.slice(-20).join('\n') : '',
          },
        });
      },
    }).then(async (result) => {
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: 'sent',
          sentCount: result.sent,
          failedCount: result.failed,
          errorLog: result.errors.length > 0 ? result.errors.slice(-50).join('\n') : '',
        },
      });
    }).catch(async (err) => {
      console.error(`Campaign ${id} send failed:`, err);
      await prisma.emailCampaign.update({
        where: { id },
        data: {
          status: 'failed',
          errorLog: err instanceof Error ? err.message : String(err),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Kampagne wird an ${recipients.length} Empfänger gesendet`,
      recipientCount: recipients.length,
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
