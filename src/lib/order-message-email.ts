/**
 * Order Message Email
 * Sends a branded email from admin to customer regarding a specific order.
 * Supports file attachments (PDF, images).
 */

import {
  siteUrl, contact, company, emailColors,
  createEmailTransporterSync, buildMailOptions,
  emailTemplate, emailHelpBoxHtml,
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

  const attachmentNote =
    opts.attachments && opts.attachments.length > 0
      ? `<div style="background:${emailColors.blueBg};border:1px solid ${emailColors.blueBorder};border-radius:8px;padding:12px;margin-top:20px;font-size:13px;color:${emailColors.blueText};">
          <strong>📎 Anhänge (${opts.attachments.length}):</strong><br>
          ${opts.attachments.map((a) => `• ${escapeHtml(a.filename)}`).join('<br>')}
        </div>`
      : '';

  const body = `
<p style="font-size:15px;color:${emailColors.textBody};line-height:1.8;margin-bottom:4px;">
  ${greeting}
</p>

<p style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px;">
  wir haben eine Nachricht bezüglich Ihrer Bestellung <strong>#${escapeHtml(opts.orderNumber)}</strong>:
</p>

<div style="background:${emailColors.lightGray};border-left:4px solid ${emailColors.primary};border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:14px;color:${emailColors.textBody};line-height:1.8;">
  ${messageHtml}
</div>

${attachmentNote}

<p style="font-size:13px;color:#666;margin-top:20px;line-height:1.6;">
  Bitte antworten Sie direkt auf diese E-Mail oder kontaktieren Sie uns über die untenstehenden Kontaktmöglichkeiten.
</p>

${emailHelpBoxHtml()}`;

  return emailTemplate({
    title: `Nachricht zu Ihrer Bestellung #${escapeHtml(opts.orderNumber)}`,
    body,
  });
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

    const mailOpts = buildMailOptions({
      to: opts.to,
      subject: `Nachricht zu Ihrer Bestellung #${opts.orderNumber}`,
      html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.path as unknown as string,
      })),
    });

    // Override attachments to use path format for file attachments
    if (opts.attachments && opts.attachments.length > 0) {
      (mailOpts as Record<string, unknown>).attachments = opts.attachments.map((a) => ({
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
