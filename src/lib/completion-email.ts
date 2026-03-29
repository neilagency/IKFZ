/**
 * Order Completion Email
 * Sends a branded email when admin marks an order as "completed".
 * Uses the same SMTP infrastructure and design system as campaign emails.
 */

import { sendCampaignEmail } from '@/lib/campaign-email';
import prisma from '@/lib/db';

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

interface CompletionEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  productName: string;
  invoiceUrl: string | null;
  isAbmeldung: boolean;
}

function buildCompletionHtml(data: CompletionEmailData): string {
  const ctaUrl = data.invoiceUrl || `${SITE_URL}/kontakt`;
  const ctaText = data.invoiceUrl ? 'Rechnung ansehen' : 'Kontakt aufnehmen';

  const helpPhone = process.env.CONTACT_PHONE || '015224999190';
  const helpPhoneFormatted = process.env.CONTACT_PHONE_DISPLAY || '01522 4999190';
  const helpWhatsApp = process.env.CONTACT_WHATSAPP || '4915224999190';
  const helpEmail = process.env.CONTACT_EMAIL || 'info@ikfzdigitalzulassung.de';

  // Service-specific content
  const serviceInfo = data.isAbmeldung
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin:20px 0;font-size:14px;color:#166534;">
        <strong>✅ Abmeldung erfolgreich!</strong><br><br>
        📌 <strong>Wichtig:</strong> Versicherung und Zollamt wurden automatisch informiert. Sie müssen nichts weiter tun!<br>
        📁 <strong>Unterlagen:</strong> Die Abmeldebestätigung finden Sie im Anhang.
      </div>
      
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:15px;margin:20px 0;font-size:14px;color:#1e40af;">
        <strong>🚗 Unser Service für Sie:</strong><br><br>
        • <strong>Neuanmeldung:</strong> Direkt hier online erledigen:<br>
        &nbsp;&nbsp;👉 <a href="${SITE_URL}/service/fahrzeug-zulassung" style="color:#0D5581;font-weight:600;">Fahrzeug online zulassen</a><br><br>
        • <strong>Auto-Verkauf:</strong> Sie möchten Ihren Wagen verkaufen? Wir machen Ihnen ein faires Angebot!<br><br>
        • <strong>Versicherung:</strong> Sie benötigen eine neue eVB-Nummer? Wir helfen sofort.
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9;">

<div style="background:#0D5581;border-radius:12px 12px 0 0;padding:30px;text-align:center;">
  <img src="${SITE_URL}/logo.webp" alt="iKFZ Digital Zulassung" style="width:180px;height:auto;margin-bottom:10px;" />
  <h1 style="color:#fff;font-size:22px;margin:0;">Ihre Bestellung wurde erfolgreich abgeschlossen</h1>
</div>

<div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  <p style="font-size:15px;color:#333;line-height:1.8;">
    ${data.customerName ? `Hallo ${escapeHtml(data.customerName)},` : 'Hallo,'}
  </p>
  
  <p style="font-size:14px;color:#333;line-height:1.8;">
    Wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung <strong>#${escapeHtml(data.orderNumber)}</strong> erfolgreich bearbeitet und abgeschlossen wurde.
  </p>

  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:15px;margin:20px 0;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:6px 0;color:#64748b;">Bestellnummer:</td>
        <td style="padding:6px 0;font-weight:600;text-align:right;">#${escapeHtml(data.orderNumber)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Service:</td>
        <td style="padding:6px 0;font-weight:600;text-align:right;">${escapeHtml(data.productName)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:#64748b;">Status:</td>
        <td style="padding:6px 0;font-weight:600;text-align:right;color:#16a34a;">✅ Abgeschlossen</td>
      </tr>
    </table>
  </div>

  ${serviceInfo}

  <div style="text-align:center;margin:30px 0;">
    <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#0D5581;color:#fff;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;">
      ${escapeHtml(ctaText)}
    </a>
  </div>

  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:15px;margin:20px 0;font-size:13px;color:#854d0e;text-align:center;">
    <strong>🤝 Zufrieden?</strong> Wir freuen uns sehr über Ihre 5-Sterne-Bewertung!<br>
    ⭐️ <a href="https://g.page/r/Cd3tHbWRE-frEAE/review" style="color:#0D5581;font-weight:600;">Hier bewerten</a>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;margin-top:25px;font-size:13px;color:#166534;">
    <strong>Brauchen Sie Hilfe?</strong><br>
    Telefon: <a href="tel:${helpPhone}" style="color:#0D5581;font-weight:600;">${helpPhoneFormatted}</a><br>
    WhatsApp: <a href="https://wa.me/${helpWhatsApp}" style="color:#0D5581;font-weight:600;">Chat starten</a><br>
    E-Mail: <a href="mailto:${helpEmail}" style="color:#0D5581;font-weight:600;">${helpEmail}</a>
  </div>
</div>

<div style="text-align:center;padding:20px;font-size:11px;color:#999;">
  <p>iKFZ Digital Zulassung UG (haftungsbeschränkt) · Gerhard-Küchen-Str. 14 · 45141 Essen</p>
</div>

</body>
</html>`;
}

/**
 * Send order completion email to the customer.
 * Returns result without throwing — caller decides how to handle failures.
 * Includes deduplication check via completionEmailSent flag.
 */
export async function sendCompletionEmail(orderId: string): Promise<{
  success: boolean;
  error?: string;
  skipped?: boolean;
}> {
  try {
    // Fetch order with related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        invoice: true,
        documents: { take: 1, orderBy: { createdAt: 'desc' } },
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Deduplication: already sent
    if (order.completionEmailSent) {
      console.log(`[completionEmail] Already sent for order #${order.orderNumber} — skipping`);
      return { success: true, skipped: true };
    }

    // Validate email
    const email = order.billingEmail;
    if (!email || !email.includes('@')) {
      return { success: false, error: `Invalid email: ${email}` };
    }

    // Build invoice URL (with token for guest access)
    let invoiceUrl: string | null = null;
    if (order.invoice) {
      // Use document token if available, otherwise direct invoice link
      if (order.documents.length > 0) {
        invoiceUrl = `${SITE_URL}/api/orders/documents/${order.documents[0].token}`;
      } else {
        invoiceUrl = `${SITE_URL}/api/admin/invoices/${order.invoice.id}/pdf`;
      }
    }

    // Determine service type
    const serviceData = order.serviceData ? JSON.parse(order.serviceData) : {};
    const isAbmeldung =
      order.productName?.toLowerCase().includes('abmeld') ||
      serviceData.formType === 'abmeldung' ||
      (!serviceData.formType && !order.productName?.toLowerCase().includes('anmeld'));

    const customerName = [order.billingFirstName, order.billingLastName].filter(Boolean).join(' ');

    const html = buildCompletionHtml({
      customerName,
      customerEmail: email,
      orderNumber: order.orderNumber || orderId,
      productName: order.productName || (isAbmeldung ? 'Fahrzeugabmeldung' : 'Fahrzeug-Zulassung'),
      invoiceUrl,
      isAbmeldung,
    });

    // Send email
    const result = await sendCampaignEmail({
      to: email,
      subject: `Bestellung #${order.orderNumber || orderId} — Erfolgreich abgeschlossen ✅`,
      html,
    });

    if (result.success) {
      // Mark as sent in DB
      await prisma.order.update({
        where: { id: orderId },
        data: { completionEmailSent: true, dateCompleted: new Date() },
      });

      // Add order note
      await prisma.orderNote.create({
        data: {
          orderId,
          note: `Abschluss-E-Mail erfolgreich an ${email} gesendet`,
          author: 'System',
        },
      });

      console.log(`[completionEmail] SUCCESS for order #${order.orderNumber} → ${email}`);
      return { success: true };
    } else {
      // Log failure as order note
      await prisma.orderNote.create({
        data: {
          orderId,
          note: `Abschluss-E-Mail fehlgeschlagen: ${result.error}`,
          author: 'System',
        },
      });

      console.error(`[completionEmail] FAILED for order #${order.orderNumber}: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[completionEmail] FATAL_ERROR for order ${orderId}:`, err);
    return { success: false, error: errorMsg };
  }
}
