/**
 * Campaign Email – branded template for mass email campaigns.
 * Sends one email at a time. The calling code is responsible for batching.
 * Supports: unsubscribe links, open tracking, click tracking.
 */

const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://ikfzdigitalzulassung.de';

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
          <a href="${ctaHref}" style="display:inline-block;background:#0D5581;color:#fff;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;">
            ${escapeHtml(campaign.ctaText)}
          </a>
        </div>`
      : '';

  // Open tracking pixel (replaced per-send)
  const trackingPixel = campaign.campaignId
    ? `<img src="${SITE_URL}/api/track/open/${campaign.campaignId}.png" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : '';

  const helpPhone = process.env.CONTACT_PHONE || '015224999190';
  const helpPhoneFormatted = process.env.CONTACT_PHONE_DISPLAY || '01522 4999190';
  const helpWhatsApp = process.env.CONTACT_WHATSAPP || '4915224999190';
  const helpEmail = process.env.CONTACT_EMAIL || 'info@ikfzdigitalzulassung.de';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9;">

<div style="background:#0D5581;border-radius:12px 12px 0 0;padding:30px;text-align:center;">
  <img src="${SITE_URL}/logo.webp" alt="iKFZ Digital Zulassung" style="width:180px;height:auto;margin-bottom:10px;" />
  <h1 style="color:#fff;font-size:22px;margin:0;">${escapeHtml(campaign.heading)}</h1>
</div>

<div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  ${heroImage}

  <div style="font-size:14px;color:#333;line-height:1.8;">
    ${campaign.content}
  </div>

  ${ctaButton}

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin-top:25px;font-size:13px;color:#166534;">
    <strong>Brauchen Sie Hilfe?</strong><br>
    Telefon: <a href="tel:${helpPhone}" style="color:#0D5581;font-weight:600;">${helpPhoneFormatted}</a><br>
    WhatsApp: <a href="https://wa.me/${helpWhatsApp}" style="color:#0D5581;font-weight:600;">Chat starten</a><br>
    E-Mail: <a href="mailto:${helpEmail}" style="color:#0D5581;font-weight:600;">${helpEmail}</a>
  </div>
</div>

<div style="text-align:center;padding:20px;font-size:11px;color:#999;">
  <p>iKFZ Digital Zulassung UG (haftungsbeschränkt) · Gerhard-Küchen-Str. 14 · 45141 Essen</p>
  <p style="margin-top:8px;">
    <a href="{{UNSUBSCRIBE_URL}}" style="color:#999;text-decoration:underline;">Vom Newsletter abmelden</a>
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

/** Create a nodemailer transporter from env vars */
function createTransporter() {
  const nodemailer = require('nodemailer'); // eslint-disable-line

  const smtpHost = process.env.SMTP_HOST || 'smtp.titan.email';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'info@ikfzdigitalzulassung.de';
  const smtpPass = process.env.SMTP_PASS_B64
    ? Buffer.from(process.env.SMTP_PASS_B64, 'base64').toString('utf-8')
    : process.env.SMTP_PASS || '';

  if (!smtpPass) {
    throw new Error('SMTP_PASS not configured');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: false },
  });
}

/**
 * Send a single campaign email. Returns success/failure.
 */
export async function sendCampaignEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.EMAIL_FROM || 'info@ikfzdigitalzulassung.de';
  const fromName = process.env.EMAIL_FROM_NAME || 'iKFZ Digital Zulassung';

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Send campaign to a batch of recipients with delay between each.
 * Updates DB progress after each batch.
 * Supports per-recipient HTML personalization (unsubscribe token).
 */
export async function sendCampaignBatch(opts: {
  campaignId: string;
  recipients: { email: string; unsubscribeToken: string }[];
  subject: string;
  html: string;
  onProgress: (sent: number, failed: number, errors: string[]) => Promise<void>;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const BATCH_SIZE = 50;
  const DELAY_BETWEEN_EMAILS_MS = 500;
  const DELAY_BETWEEN_BATCHES_MS = 3000;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < opts.recipients.length; i += BATCH_SIZE) {
    const batch = opts.recipients.slice(i, i + BATCH_SIZE);

    for (const recipient of batch) {
      // Personalize HTML with recipient's unsubscribe token
      const personalHtml = personalizeHtml(opts.html, recipient.unsubscribeToken);

      const result = await sendCampaignEmail({
        to: recipient.email,
        subject: opts.subject,
        html: personalHtml,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
        errors.push(`${recipient.email}: ${result.error}`);
      }

      // Small delay between emails to avoid rate limiting
      if (DELAY_BETWEEN_EMAILS_MS > 0) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EMAILS_MS));
      }
    }

    // Report progress after each batch
    await opts.onProgress(sent, failed, errors);

    // Longer delay between batches
    if (i + BATCH_SIZE < opts.recipients.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  return { sent, failed, errors };
}
