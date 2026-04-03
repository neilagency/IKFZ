/**
 * Order Message Email
 * Sends a branded email from admin to customer regarding a specific order.
 * Supports file attachments (PDF, images).
 */

import {
  siteUrl, contact, company, emailColors, emailFrom,
  createEmailTransporterSync, emailFromField,
} from '@/lib/email-config';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Convert plain text newlines to HTML paragraphs */
function textToHtml(text: string): string {
  return text
    .split('\n')
    .map((line) => `<p style="margin:0 0 8px 0;">${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('');
}

interface OrderMessageEmailOpts {
  to: string;
  customerName?: string;
  orderNumber: string;
  message: string;
  attachments?: { filename: string; path: string }[];
}

function buildMessageHtml(opts: OrderMessageEmailOpts): string {
  const greeting = opts.customerName
    ? `Sehr geehrte/r ${escapeHtml(opts.customerName)},`
    : 'Sehr geehrter Kunde,';

  const messageHtml = textToHtml(opts.message);

  const helpPhone = contact.phone;
  const helpPhoneFormatted = contact.phoneDisplay;
  const helpWhatsApp = contact.whatsapp;
  const helpEmail = contact.email;

  const attachmentNote =
    opts.attachments && opts.attachments.length > 0
      ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin-top:20px;font-size:13px;color:#0369a1;">
          <strong>📎 Anhänge (${opts.attachments.length}):</strong><br>
          ${opts.attachments.map((a) => `• ${escapeHtml(a.filename)}`).join('<br>')}
        </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9;">

<div style="background:${emailColors.primary};border-radius:12px 12px 0 0;padding:30px;text-align:center;">
  <img src="${siteUrl}/logo.webp" alt="${company.name}" style="width:180px;height:auto;margin-bottom:10px;" />
  <h1 style="color:#fff;font-size:20px;margin:0;">Nachricht zu Ihrer Bestellung #${escapeHtml(opts.orderNumber)}</h1>
</div>

<div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  <p style="font-size:15px;color:#333;line-height:1.8;margin-bottom:4px;">
    ${greeting}
  </p>

  <p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px;">
    wir haben eine Nachricht bezüglich Ihrer Bestellung <strong>#${escapeHtml(opts.orderNumber)}</strong>:
  </p>

  <div style="background:#f8fafc;border-left:4px solid #0D5581;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:14px;color:#333;line-height:1.8;">
    ${messageHtml}
  </div>

  ${attachmentNote}

  <p style="font-size:13px;color:#666;margin-top:20px;line-height:1.6;">
    Bitte antworten Sie direkt auf diese E-Mail oder kontaktieren Sie uns über die untenstehenden Kontaktmöglichkeiten.
  </p>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin-top:25px;font-size:13px;color:#166534;">
    <strong>Brauchen Sie Hilfe?</strong><br>
    Telefon: <a href="tel:${helpPhone}" style="color:#0D5581;font-weight:600;">${helpPhoneFormatted}</a><br>
    WhatsApp: <a href="https://wa.me/${helpWhatsApp}" style="color:#0D5581;font-weight:600;">Chat starten</a><br>
    E-Mail: <a href="mailto:${helpEmail}" style="color:#0D5581;font-weight:600;">${helpEmail}</a>
  </div>
</div>

<div style="text-align:center;padding:20px;font-size:11px;color:#999;">
  <p>${company.nameFull} · ${company.address}</p>
</div>

</body>
</html>`;
}

/**
 * Send order message email to customer.
 */
export async function sendOrderMessageEmail(
  opts: OrderMessageEmailOpts
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = createEmailTransporterSync();
    const html = buildMessageHtml(opts);

    const mailOpts: Record<string, unknown> = {
      from: emailFromField(),
      replyTo: emailFrom,
      to: opts.to,
      subject: `Nachricht zu Ihrer Bestellung #${opts.orderNumber}`,
      html,
    };

    // Add attachments if present
    if (opts.attachments && opts.attachments.length > 0) {
      mailOpts.attachments = opts.attachments.map((a) => ({
        filename: a.filename,
        path: a.path,
      }));
    }

    await transporter.sendMail(mailOpts);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
