import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildCampaignHtml, sendCampaignBatch } from '@/lib/campaign-email';
import { resolveRecipients } from '@/lib/campaign-recipients';

export const dynamic = 'force-dynamic';

/** GET /api/cron/send-scheduled – send scheduled campaigns */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const campaigns = await prisma.emailCampaign.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
      },
    });

    if (campaigns.length === 0) {
      return NextResponse.json({ message: 'No scheduled campaigns', started: 0 });
    }

    let started = 0;

    for (const campaign of campaigns) {
      if (!campaign.subject || !campaign.heading || !campaign.content) continue;

      const recipients = await resolveRecipients({
        targetMode: campaign.targetMode,
        targetEmails: campaign.targetEmails,
        targetSegment: campaign.targetSegment,
      });

      if (recipients.length === 0) continue;

      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: {
          status: 'sending',
          sentCount: 0,
          failedCount: 0,
          totalRecipients: recipients.length,
          sentAt: new Date(),
        },
      });

      const html = buildCampaignHtml({
        subject: campaign.subject,
        heading: campaign.heading,
        content: campaign.content,
        imageUrl: campaign.imageUrl || undefined,
        ctaText: campaign.ctaText || undefined,
        ctaUrl: campaign.ctaUrl || undefined,
        campaignId: campaign.id,
      });

      // Fire and forget
      sendCampaignBatch({
        campaignId: campaign.id,
        recipients,
        subject: campaign.subject,
        html,
        onProgress: async (sent, failed, errors) => {
          await prisma.emailCampaign.update({
            where: { id: campaign.id },
            data: {
              sentCount: sent,
              failedCount: failed,
              errorLog: errors.length > 0 ? errors.slice(-20).join('\n') : '',
            },
          });
        },
      }).then(async (result) => {
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'sent',
            sentCount: result.sent,
            failedCount: result.failed,
            errorLog: result.errors.length > 0 ? result.errors.slice(-50).join('\n') : '',
          },
        });
      }).catch(async (err) => {
        console.error(`Scheduled campaign ${campaign.id} send failed:`, err);
        await prisma.emailCampaign.update({
          where: { id: campaign.id },
          data: {
            status: 'failed',
            errorLog: err instanceof Error ? err.message : String(err),
          },
        });
      });

      started++;
    }

    return NextResponse.json({
      message: `Started ${started} scheduled campaign(s)`,
      started,
    });
  } catch (error) {
    console.error('Cron send-scheduled error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
