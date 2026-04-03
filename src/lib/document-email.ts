/**
 * Document Email Notification
 * Sends a branded email when a PDF document is uploaded for an order.
 */

import {
  siteUrl as SITE_URL, smtp, contact, company, emailColors,
  createEmailTransporter, buildMailOptions,
  emailTemplate, emailHelpBoxHtml, emailButtonHtml, emailTableRow,
} from '@/lib/email-config';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendDocumentEmail(opts: {
  to: string;
  customerName: string;
  orderNumber: number;
  fileName: string;
  downloadToken: string;
  documentId: string;
  pdfBuffer?: Buffer;
}): Promise<{ success: boolean; error?: string }> {
  if (!smtp.configured) {
    console.error('[document-email] SMTP_PASS not configured');
    return { success: false, error: 'SMTP not configured' };
  }

  const transporter = await createEmailTransporter();

  try {
    await transporter.verify();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[document-email] SMTP verification failed:', msg);
    return { success: false, error: 'SMTP connection failed: ' + msg };
  }

  const downloadUrl = `${SITE_URL}/api/documents/${opts.documentId}/download/?token=${opts.downloadToken}`;

  const emailHTML = emailTemplate({
    title: 'Ihr Dokument ist verfügbar',
    body: `
<p style="font-size:15px;margin-bottom:20px;">
  Sehr geehrte/r <strong>${escapeHtml(opts.customerName)}</strong>,
</p>

<p style="font-size:14px;color:${emailColors.textBody};line-height:1.7;">
  Ihr Dokument zu Bestellung <strong>#${opts.orderNumber}</strong> wurde erfolgreich bearbeitet und steht jetzt zum Download bereit.
</p>

<div style="background:${emailColors.lightGray};border:1px solid ${emailColors.border};border-radius:10px;padding:20px;margin:20px 0;">
  <table style="width:100%;border-collapse:collapse;">
    ${emailTableRow('Bestellnummer:', `#${opts.orderNumber}`)}
    ${emailTableRow('Dokument:', escapeHtml(opts.fileName))}
  </table>
</div>

${emailButtonHtml('📄 Dokument herunterladen', downloadUrl)}

<p style="font-size:13px;color:#666;line-height:1.6;">
  Das Dokument ist auch als PDF-Anhang beigefügt. Falls Sie ein Kundenkonto haben, finden Sie alle Ihre Dokumente unter
  <a href="${SITE_URL}/konto/bestellungen" style="color:${emailColors.primary};font-weight:600;">Mein Konto → Bestellungen</a>.
</p>

${emailHelpBoxHtml()}`,
  });

  const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
  if (opts.pdfBuffer) {
    attachments.push({
      filename: opts.fileName,
      content: opts.pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail(buildMailOptions({
        to: opts.to,
        subject: `Ihr Dokument zu Bestellung #${opts.orderNumber} ist verfügbar`,
        html: emailHTML,
        attachments,
      }));
      console.log(`[document-email] Sent to ${opts.to} for order #${opts.orderNumber}`);
      return { success: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[document-email] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  return { success: false, error: lastError };
}
