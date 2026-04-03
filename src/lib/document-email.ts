/**
 * Document Email Notification
 * Sends a branded email when a PDF document is uploaded for an order.
 */

import {
  siteUrl as SITE_URL, smtp, contact, company, emailColors,
  createEmailTransporter, emailFromField,
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

  const downloadUrl = `${SITE_URL}/api/documents/${opts.documentId}/download?token=${opts.downloadToken}`;

  const helpPhone = contact.phone;
  const helpPhoneFormatted = contact.phoneDisplay;
  const helpWhatsApp = contact.whatsapp;
  const helpEmail = contact.email;

  const emailHTML = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9;">

<div style="background:#16a34a;border-radius:12px 12px 0 0;padding:30px;text-align:center;">
  <h1 style="color:#fff;font-size:22px;margin:0;">Ihr Dokument ist verfügbar</h1>
</div>

<div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  <p style="font-size:15px;margin-bottom:20px;">
    Sehr geehrte/r <strong>${escapeHtml(opts.customerName)}</strong>,
  </p>

  <p style="font-size:14px;color:#333;line-height:1.7;">
    Ihr Dokument zu Bestellung <strong>#${opts.orderNumber}</strong> wurde erfolgreich bearbeitet und steht jetzt zum Download bereit.
  </p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:20px 0;">
    <table style="width:100%;font-size:13px;">
      <tr>
        <td style="padding:8px 0;color:#777;">Bestellnummer:</td>
        <td style="padding:8px 0;font-weight:700;text-align:right;">#${opts.orderNumber}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#777;">Dokument:</td>
        <td style="padding:8px 0;font-weight:600;text-align:right;">${escapeHtml(opts.fileName)}</td>
      </tr>
    </table>
  </div>

  <div style="text-align:center;margin:25px 0;">
    <a href="${downloadUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;">
      📄 Dokument herunterladen
    </a>
  </div>

  <p style="font-size:13px;color:#666;line-height:1.6;">
    Das Dokument ist auch als PDF-Anhang beigefügt. Falls Sie ein Kundenkonto haben, finden Sie alle Ihre Dokumente unter
    <a href="${SITE_URL}/konto/bestellungen" style="color:#16a34a;font-weight:600;">Mein Konto → Bestellungen</a>.
  </p>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin-top:20px;font-size:13px;color:#166534;">
    <strong>Brauchen Sie Hilfe?</strong><br>
    Telefon: <a href="tel:${helpPhone}" style="color:#16a34a;font-weight:600;">${helpPhoneFormatted}</a><br>
    WhatsApp: <a href="https://wa.me/${helpWhatsApp}" style="color:#16a34a;font-weight:600;">Chat starten</a><br>
    E-Mail: <a href="mailto:${helpEmail}" style="color:#16a34a;font-weight:600;">${helpEmail}</a>
  </div>
</div>

<div style="text-align:center;padding:20px;font-size:11px;color:#999;">
  <p>${company.nameFull} · ${company.address}</p>
</div>

</body>
</html>`;

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
      await transporter.sendMail({
        from: emailFromField(),
        to: opts.to,
        subject: `Ihr Dokument zu Bestellung #${opts.orderNumber} ist verfügbar`,
        html: emailHTML,
        attachments,
      });
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
