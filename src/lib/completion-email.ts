/**
 * Order Completion Email
 * Sends a branded email when admin marks an order as "completed".
 * Uses the same SMTP infrastructure and design system as campaign emails.
 */

import { sendCampaignEmail } from '@/lib/campaign-email';
import prisma from '@/lib/db';
import {
  siteUrl as SITE_URL, contact, company, emailColors,
  emailTemplate, emailHelpBoxHtml, emailButtonHtml,
} from '@/lib/email-config';

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

  // Service-specific content
  const serviceInfo = data.isAbmeldung
    ? `<div style="background:${emailColors.lightGreen};border:1px solid ${emailColors.greenBorder};border-radius:8px;padding:15px;margin:20px 0;font-size:14px;color:${emailColors.greenText};">
        <strong>✅ Abmeldung erfolgreich!</strong><br><br>
        📌 <strong>Wichtig:</strong> Versicherung und Zollamt wurden automatisch informiert. Sie müssen nichts weiter tun!<br>
        📁 <strong>Unterlagen:</strong> Die Abmeldebestätigung finden Sie im Anhang.
      </div>
      
      <div style="background:${emailColors.blueBg};border:1px solid ${emailColors.blueBorder};border-radius:8px;padding:15px;margin:20px 0;font-size:14px;color:${emailColors.blueText};">
        <strong>🚗 Unser Service für Sie:</strong><br><br>
        • <strong>Neuanmeldung:</strong> Direkt hier online erledigen:<br>
        &nbsp;&nbsp;👉 <a href="${SITE_URL}/service/fahrzeug-zulassung" style="color:${emailColors.primary};font-weight:600;">Fahrzeug online zulassen</a><br><br>
        • <strong>Auto-Verkauf:</strong> Sie möchten Ihren Wagen verkaufen? Wir machen Ihnen ein faires Angebot!<br><br>
        • <strong>Versicherung:</strong> Sie benötigen eine neue eVB-Nummer? Wir helfen sofort.
      </div>`
    : '';

  const body = `
<p style="font-size:15px;color:${emailColors.textBody};line-height:1.8;">
  ${data.customerName ? `Hallo ${escapeHtml(data.customerName)},` : 'Hallo,'}
</p>

<p style="font-size:14px;color:${emailColors.textBody};line-height:1.8;">
  Wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung <strong>#${escapeHtml(data.orderNumber)}</strong> erfolgreich bearbeitet und abgeschlossen wurde.
</p>

<div style="background:${emailColors.lightGray};border:1px solid ${emailColors.border};border-radius:8px;padding:15px;margin:20px 0;">
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr>
      <td style="padding:6px 0;color:${emailColors.textGray};">Bestellnummer:</td>
      <td style="padding:6px 0;font-weight:600;text-align:right;">#${escapeHtml(data.orderNumber)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:${emailColors.textGray};">Service:</td>
      <td style="padding:6px 0;font-weight:600;text-align:right;">${escapeHtml(data.productName)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:${emailColors.textGray};">Status:</td>
      <td style="padding:6px 0;font-weight:600;text-align:right;color:${emailColors.primary};">✅ Abgeschlossen</td>
    </tr>
  </table>
</div>

${serviceInfo}

${emailButtonHtml(escapeHtml(ctaText), escapeHtml(ctaUrl))}

<div style="background:${emailColors.yellowBg};border:1px solid ${emailColors.yellowBorder};border-radius:8px;padding:15px;margin:20px 0;font-size:13px;color:${emailColors.yellowText};text-align:center;">
  <strong>🤝 Zufrieden?</strong> Wir freuen uns sehr über Ihre 5-Sterne-Bewertung!<br>
  ⭐️ <a href="${company.googleReviewUrl}" style="color:${emailColors.primary};font-weight:600;">Hier bewerten</a>
</div>

${emailHelpBoxHtml()}`;

  return emailTemplate({
    title: 'Ihre Bestellung wurde erfolgreich abgeschlossen',
    body,
  });
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
