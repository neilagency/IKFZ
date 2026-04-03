/**
 * Campaign Email – branded template for mass email campaigns.
 * Sends one email at a time. The calling code is responsible for batching.
 * Supports: unsubscribe links, open tracking, click tracking.
 */

import {
  siteUrl as SITE_URL, company, contact, emailColors,
  createEmailTransporterSync, buildMailOptions,
  emailHeaderHtml, emailFooterHtml, emailHelpBoxHtml,
} from '@/lib/email-config';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface CampaignContent {
  subject: string;
  heading: string;
  content: string; // HTML body
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  campaignId?: string; // for tracking
}

/** Build the branded campaign HTML with placeholders for per-recipient personalization */
export function buildCampaignHtml(campaign: CampaignContent): string {
  const heroImage = campaign.imageUrl
    ? `<div style="text-align:center;margin-bottom:20px;">
        <img src="${escapeHtml(campaign.imageUrl)}" alt="" style="max-width:100%;height:auto;border-radius:10px;" />
      </div>`
    : '';

  // Wrap CTA URL with click tracking if campaignId provided
  const ctaHref = campaign.ctaText && campaign.ctaUrl
    ? (campaign.campaignId
        ? `${SITE_URL}/api/track/click/${campaign.campaignId}?url=${encodeURIComponent(campaign.ctaUrl)}`
        : escapeHtml(campaign.ctaUrl))
    : '';

  const ctaButton =
    campaign.ctaText && campaign.ctaUrl
      ? `<div style="text-align:center;margin:30px 0;">
          <a href="${ctaHref}" style="display:inline-block;background:${emailColors.primary};color:#fff;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;">
            ${escapeHtml(campaign.ctaText)}
          </a>
        </div>`
      : '';

  // Open tracking pixel (replaced per-send)
  const trackingPixel = campaign.campaignId
    ? `<img src="${SITE_URL}/api/track/open/${campaign.campaignId}.png" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:${emailColors.textDark};max-width:600px;margin:0 auto;padding:20px;background:${emailColors.bodyBg};">

${emailHeaderHtml(escapeHtml(campaign.heading))}

<div style="background:${emailColors.cardBg};border:1px solid ${emailColors.border};border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  ${heroImage}

  <div style="font-size:14px;color:${emailColors.textBody};line-height:1.8;">
    ${campaign.content}
  </div>

  ${ctaButton}

  ${emailHelpBoxHtml()}
</div>

<div style="text-align:center;padding:25px 20px;color:${emailColors.footerGray};font-size:12px;line-height:1.6;">
  <p style="margin:0 0 4px;">${company.nameFull}</p>
  <p style="margin:0 0 4px;">${company.address}</p>
  <p style="margin:0;">Tel.: ${contact.phoneDisplay} · E-Mail: ${contact.email}</p>
  <p style="margin:8px 0 0;"><a href="https://${company.website}" style="color:${emailColors.primary};text-decoration:none;font-weight:600;">${company.website}</a></p>
  <p style="margin-top:12px;">
    <a href="{{UNSUBSCRIBE_URL}}" style="color:${emailColors.footerGray};text-decoration:underline;">Vom Newsletter abmelden</a>
  </p>
  ${trackingPixel}
</div>

</body>
</html>`;
}

/**
 * Replace the unsubscribe placeholder with the actual per-recipient URL.
 */
export function personalizeHtml(html: string, unsubscribeToken: string): string {
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe/${unsubscribeToken}`;
  return html.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);
}

/**
 * Send a single campaign email. Returns success/failure.
 */
export async function sendCampaignEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createEmailTransporterSync();
    await transporter.sendMail(buildMailOptions({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }));
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Send campaign to a batch of recipients with rate limiting.
 * Titan Mail allows 50 emails/hour, so we send 40/hour (safe margin)
 * and pause automatically when nearing the limit.
 */
export async function sendCampaignBatch(opts: {
  campaignId: string;
  recipients: { email: string; unsubscribeToken: string }[];
  subject: string;
  html: string;
  onProgress: (sent: number, failed: number, errors: string[]) => Promise<void>;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const HOURLY_LIMIT = 40; // Titan allows 50, keep 10 buffer for transactional emails
  const DELAY_BETWEEN_EMAILS_MS = 2000; // 2 seconds between each email
  const HOURLY_PAUSE_MS = 65 * 60 * 1000; // 65 minutes pause when limit reached
  const PROGRESS_INTERVAL = 5; // Report progress every N emails

  let sent = 0;
  let failed = 0;
  let hourlySent = 0;
  let hourStart = Date.now();
  const errors: string[] = [];

  for (let i = 0; i < opts.recipients.length; i++) {
    const recipient = opts.recipients[i];

    // Check if we've hit the hourly limit
    const elapsed = Date.now() - hourStart;
    if (hourlySent >= HOURLY_LIMIT) {
      const waitTime = Math.max(HOURLY_PAUSE_MS - elapsed, 60_000);
      const waitMinutes = Math.ceil(waitTime / 60_000);
      console.log(`[campaign] Hourly limit reached (${hourlySent}/${HOURLY_LIMIT}). Pausing ${waitMinutes} min...`);

      // Report progress before pausing
      await opts.onProgress(sent, failed, errors);

      await new Promise((r) => setTimeout(r, waitTime));

      // Reset hourly counter
      hourlySent = 0;
      hourStart = Date.now();
    }

    // Personalize HTML with recipient's unsubscribe token
    const personalHtml = personalizeHtml(opts.html, recipient.unsubscribeToken);

    const result = await sendCampaignEmail({
      to: recipient.email,
      subject: opts.subject,
      html: personalHtml,
    });

    if (result.success) {
      sent++;
      hourlySent++;
    } else {
      failed++;
      errors.push(`${recipient.email}: ${result.error}`);

      // If quota exceeded error, pause immediately
      if (result.error && /quota|limit|exceeded|too many/i.test(result.error)) {
        console.log(`[campaign] Quota error detected. Pausing 65 min...`);
        await opts.onProgress(sent, failed, errors);
        await new Promise((r) => setTimeout(r, HOURLY_PAUSE_MS));
        hourlySent = 0;
        hourStart = Date.now();

        // Retry this recipient
        const retry = await sendCampaignEmail({
          to: recipient.email,
          subject: opts.subject,
          html: personalHtml,
        });
        if (retry.success) {
          sent++;
          hourlySent++;
          failed--; // undo the failure count
          errors.pop();
        }
      }
    }

    // Report progress periodically
    if ((sent + failed) % PROGRESS_INTERVAL === 0 || i === opts.recipients.length - 1) {
      await opts.onProgress(sent, failed, errors);
    }

    // Delay between emails
    if (i < opts.recipients.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EMAILS_MS));
    }
  }

  // Final progress report
  await opts.onProgress(sent, failed, errors);

  return { sent, failed, errors };
}
