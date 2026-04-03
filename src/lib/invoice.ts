/**
 * Invoice PDF Generation & Email Sending
 * =======================================
 * Uses jsPDF (lightweight, no browser/Chromium needed).
 * Adapted for Project B (ikfzdigitalzulassung.de) schema:
 *   - Order.billingFirstName / billingLastName (not billingFirst/billingLast)
 *   - Order.billingAddress1 (not billingStreet)
 *   - Order.payment (singular relation)
 *   - Order.invoice (singular relation)
 *   - Invoice.amount (not total), Invoice.issuedAt (not invoiceDate)
 */

import prisma from '@/lib/db';
import { type InvoiceData } from '@/lib/invoice-template';
import {
  siteUrl as SITE_URL, smtp, contact, company, emailColors,
  adminEmail, createEmailTransporter, buildMailOptions,
  emailTemplate, emailHelpBoxHtml, emailButtonHtml, emailTableRow,
} from '@/lib/email-config';

function formatDateDE(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTimeDE(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function generateInvoicePDF(orderId: string): Promise<{
  pdfBuffer: Buffer;
  invoiceData: InvoiceData;
  invoiceNumber: string;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true, invoice: true },
  });

  if (!order) throw new Error(`Order not found: ${orderId}`);
  const invoice = order.invoice;
  if (!invoice) throw new Error(`No invoice found for order: ${orderId}`);

  let serviceData: Record<string, any> = {};
  try {
    serviceData = JSON.parse(order.serviceData || '{}');
  } catch {
    serviceData = {};
  }

  // Parse line items from invoice.items (JSON) or fallback to order.items
  let invoiceItems: Array<{ name: string; quantity: number; price: number; total: number }> = [];
  try {
    invoiceItems = JSON.parse(invoice.items || '[]');
  } catch {
    invoiceItems = order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));
  }

  const uploadedFiles = serviceData.uploadedFiles || undefined;
  const payment = order.payment;
  const paymentMethod =
    order.paymentMethodTitle || order.paymentMethod || 'Unbekannt';
  const paymentStatus = payment?.status || invoice.status || 'pending';
  const transactionId = order.transactionId || payment?.transactionId || '';

  // Compute financials (Invoice model in B only stores `amount`)
  const total = invoice.amount > 0 ? invoice.amount : order.total;
  const subtotal = order.subtotal > 0 ? order.subtotal : total / 1.19;
  const taxRate = 19;
  const taxAmount = parseFloat((total - total / (1 + taxRate / 100)).toFixed(2));

  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: formatDateDE(invoice.issuedAt || invoice.createdAt),
    orderNumber: order.orderNumber || order.id.substring(0, 8).toUpperCase(),
    orderDate: formatDateTimeDE(order.createdAt),
    paymentMethod,
    paymentStatus,
    transactionId,
    customerName:
      `${order.billingFirstName || ''} ${order.billingLastName || ''}`.trim() ||
      'Kunde',
    customerEmail: order.billingEmail || '',
    customerPhone: order.billingPhone || '',
    customerStreet: order.billingAddress1 || undefined,
    customerPostcode: order.billingPostcode || undefined,
    customerCity: order.billingCity || undefined,
    productName: order.productName || '',
    serviceData,
    uploadedFiles,
    items: invoiceItems,
    subtotal,
    taxRate,
    taxAmount,
    total,
    paymentFee: order.paymentFee || 0,
  };

  let pdfBuffer: Buffer;
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const m = 15;
    const cw = pw - m * 2;
    let y = 15;

    // Header bar
    doc.setFillColor(13, 85, 129);
    doc.rect(0, 0, pw, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RECHNUNG', m, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(company.name, m, 22);
    doc.text(company.website, m, 27);
    doc.text('Nr. ' + invoiceData.invoiceNumber, pw - m, 15, {
      align: 'right',
    });
    doc.text('Datum: ' + invoiceData.invoiceDate, pw - m, 22, {
      align: 'right',
    });
    doc.text('Bestellung #' + invoiceData.orderNumber, pw - m, 29, {
      align: 'right',
    });

    y = 45;
    // Billing address
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('RECHNUNGSADRESSE', m, y);
    y += 5;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.customerName, m, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (invoiceData.customerStreet) {
      doc.text(invoiceData.customerStreet, m, y);
      y += 5;
    }
    if (invoiceData.customerPostcode || invoiceData.customerCity) {
      doc.text(
        (
          (invoiceData.customerPostcode || '') +
          ' ' +
          (invoiceData.customerCity || '')
        ).trim(),
        m,
        y,
      );
      y += 5;
    }
    doc.text(invoiceData.customerEmail, m, y);
    y += 5;
    if (invoiceData.customerPhone) {
      doc.text('Tel: ' + invoiceData.customerPhone, m, y);
      y += 5;
    }

    // Sender info (top-right column)
    const cx = pw / 2 + 10;
    let cy = 45;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('ABSENDER', cx, cy);
    cy += 5;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(company.name, cx, cy);
    cy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(company.nameFullAscii.replace(company.name + ' ', ''), cx, cy);
    cy += 5;
    doc.setFontSize(10);
    for (const line of [
      company.streetAscii,
      `${company.zip} ${company.city}`,
      contact.email,
      `Tel: ${contact.phoneDisplay}`,
    ]) {
      doc.text(line, cx, cy);
      cy += 5;
    }

    y = Math.max(y, cy) + 8;

    // Payment info bar
    doc.setFillColor(240, 245, 250);
    doc.rect(m, y, cw, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Zahlungsmethode: ' + invoiceData.paymentMethod, m + 3, y + 5.5);
    doc.text(
      'Status: ' +
        (invoiceData.paymentStatus === 'paid' ? 'Bezahlt' : 'Ausstehend'),
      pw - m - 3,
      y + 5.5,
      { align: 'right' },
    );
    y += 14;

    // Table header
    doc.setFillColor(13, 85, 129);
    doc.rect(m, y, cw, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BESCHREIBUNG', m + 3, y + 5.5);
    doc.text('MENGE', pw - m - 55, y + 5.5, { align: 'center' });
    doc.text('PREIS', pw - m - 30, y + 5.5, { align: 'right' });
    doc.text('GESAMT', pw - m - 3, y + 5.5, { align: 'right' });
    y += 8;

    // Line items
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (let i = 0; i < invoiceData.items.length; i++) {
      const item = invoiceData.items[i];
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(m, y, cw, 7, 'F');
      }
      doc.text(item.name, m + 3, y + 5);
      doc.text(String(item.quantity), pw - m - 55, y + 5, { align: 'center' });
      doc.text(item.price.toFixed(2) + ' EUR', pw - m - 30, y + 5, {
        align: 'right',
      });
      doc.text(item.total.toFixed(2) + ' EUR', pw - m - 3, y + 5, {
        align: 'right',
      });
      y += 7;
    }

    // Totals
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(pw - m - 70, y, pw - m, y);
    y += 6;
    doc.setFontSize(9);
    doc.text('Nettobetrag:', pw - m - 70, y);
    doc.text(
      (invoiceData.total / (1 + invoiceData.taxRate / 100)).toFixed(2) +
        ' EUR',
      pw - m - 3,
      y,
      { align: 'right' },
    );
    y += 5;
    doc.text('MwSt. (' + invoiceData.taxRate + '%):', pw - m - 70, y);
    doc.text(invoiceData.taxAmount.toFixed(2) + ' EUR', pw - m - 3, y, {
      align: 'right',
    });
    y += 6;

    // Total row
    doc.setFillColor(13, 85, 129);
    doc.rect(pw - m - 70, y - 1, 70, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Gesamtbetrag:', pw - m - 67, y + 5.5);
    doc.text(invoiceData.total.toFixed(2) + ' EUR', pw - m - 3, y + 5.5, {
      align: 'right',
    });
    y += 15;

    // Service details
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    const sKeys = Object.keys(invoiceData.serviceData || {}).filter(
      (k) =>
        !['productId', 'productPrice', 'formType', 'uploadedFiles'].includes(
          k,
        ) && invoiceData.serviceData[k],
    );
    if (sKeys.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('AUFTRAGSDETAILS', m, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const labels: Record<string, string> = {
        kennzeichen: 'Kennzeichen',
        fin: 'FIN',
        sicherheitscode: 'Sicherheitscode',
        stadtKreis: 'Stadt/Kreis',
        codeVorne: 'Code Vorne',
        codeHinten: 'Code Hinten',
        wunschkennzeichen: 'Wunschkennzeichen',
        reservierung: 'Reservierung',
      };
      for (const key of sKeys) {
        doc.text(
          (labels[key] || key) + ': ' + String(invoiceData.serviceData[key]),
          m,
          y,
        );
        y += 5;
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
      }
    }

    // Footer
    const fy = 282;
    doc.setDrawColor(200, 200, 200);
    doc.line(m, fy - 3, pw - m, fy - 3);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${company.nameFullAscii} · ${company.addressAscii} · ${contact.email} · ${company.website}`,
      pw / 2,
      fy,
      { align: 'center' },
    );

    const ab = doc.output('arraybuffer');
    pdfBuffer = Buffer.from(ab);
  } catch (pdfErr) {
    console.error('[invoice] jsPDF generation failed:', pdfErr);
    throw new Error(
      'PDF generation failed: ' +
        (pdfErr instanceof Error ? pdfErr.message : 'Unknown'),
    );
  }

  // Persist computed values + mark as generated
  try {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'issued',
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxRate,
        taxAmount,
        paymentMethod,
        transactionId,
      },
    });
  } catch (e) {
    console.warn('[invoice] Could not update invoice:', e);
  }

  return { pdfBuffer, invoiceData, invoiceNumber: invoice.invoiceNumber };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendInvoiceEmail(opts: {
  to: string;
  customerName: string;
  orderNumber: number | string;
  invoiceNumber: string;
  total: string;
  paymentMethod: string;
  pdfBuffer: Buffer;
  sendAdminCopy?: boolean;
  orderId?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!smtp.configured) {
    console.error('[email] SMTP_PASS is not configured - skipping email');
    return { success: false, error: 'SMTP not configured' };
  }

  console.log(
    `[email] SMTP: host=${smtp.host} port=${smtp.port} user=${smtp.user} passSource=${process.env.SMTP_PASS_B64 ? 'B64' : 'RAW'} passLen=${smtp.pass.length}`,
  );

  const transporter = await createEmailTransporter();

  try {
    await transporter.verify();
    console.log('[email] SMTP connection verified successfully');
  } catch (verifyErr) {
    const msg =
      verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
    console.error('[email] SMTP connection FAILED:', msg);
    return { success: false, error: 'SMTP connection failed: ' + msg };
  }

  const emailHTML = emailTemplate({
    title: 'Ihre Rechnung & Bestellbestätigung',
    body: `
<p style="font-size:15px;margin-bottom:20px;">Sehr geehrte/r <strong>${escapeHtml(opts.customerName)}</strong>,</p>
<p style="font-size:14px;color:${emailColors.textBody};line-height:1.7;">vielen Dank für Ihre Bestellung bei <strong>${company.name}</strong>! Wir haben Ihren Auftrag erhalten und werden diesen umgehend bearbeiten.</p>

<div style="background:${emailColors.lightGray};border:1px solid ${emailColors.border};border-radius:10px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
${emailTableRow('Bestellnummer:', `#${opts.orderNumber}`)}
${emailTableRow('Rechnungsnr.:', escapeHtml(opts.invoiceNumber))}
${emailTableRow('Zahlungsmethode:', escapeHtml(opts.paymentMethod))}
${emailTableRow('Gesamtbetrag:', `${escapeHtml(opts.total)} EUR`, true)}
</table>
</div>

<p style="font-size:14px;color:${emailColors.textBody};line-height:1.7;">Ihre detaillierte Rechnung finden Sie als <strong>PDF im Anhang</strong> dieser E-Mail.</p>
<p style="font-size:14px;color:${emailColors.textBody};line-height:1.7;">Sie erhalten alle relevanten Dokumente innerhalb von <strong>24 Stunden</strong> per E-Mail oder WhatsApp.</p>

${emailButtonHtml('Zur Website', SITE_URL)}
${emailHelpBoxHtml()}`,
  });

  const fileName = 'Rechnung-' + opts.invoiceNumber + '.pdf';
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail(buildMailOptions({
        to: opts.to,
        subject:
          'Ihre Bestellung #' +
          opts.orderNumber +
          ' & Rechnung ' +
          opts.invoiceNumber,
        html: emailHTML,
        attachments: [
          {
            filename: fileName,
            content: opts.pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      }));
      console.log(
        `[email] Invoice email sent to ${opts.to} for order #${opts.orderNumber}`,
      );

      // Admin copy
      if (opts.sendAdminCopy !== false && adminEmail) {
        const orderUrl = opts.orderId
          ? `${SITE_URL}/admin/orders/${opts.orderId}`
          : `${SITE_URL}/admin/orders`;

        const adminHTML = emailTemplate({
          title: 'Neue Bestellung eingegangen',
          body: `
<p style="font-size:15px;margin-bottom:20px;">Eine neue Bestellung ist eingegangen:</p>

<div style="background:${emailColors.lightGray};border:1px solid ${emailColors.border};border-radius:10px;padding:20px;margin:20px 0;">
<table style="width:100%;border-collapse:collapse;">
${emailTableRow('Bestellnummer:', `#${opts.orderNumber}`)}
${emailTableRow('Rechnungsnr.:', escapeHtml(opts.invoiceNumber))}
${emailTableRow('Kunde:', escapeHtml(opts.customerName))}
${emailTableRow('E-Mail:', escapeHtml(opts.to))}
${emailTableRow('Zahlungsmethode:', escapeHtml(opts.paymentMethod))}
${emailTableRow('Gesamtbetrag:', `${escapeHtml(opts.total)} EUR`, true)}
</table>
</div>

${emailButtonHtml('Bestellung in Dashboard öffnen', orderUrl)}`,
        });

        try {
          await transporter.sendMail(buildMailOptions({
            to: adminEmail,
            subject:
              '[Admin] Neue Bestellung #' +
              opts.orderNumber +
              ' - ' +
              opts.invoiceNumber,
            html: adminHTML,
            attachments: [
              {
                filename: fileName,
                content: opts.pdfBuffer,
                contentType: 'application/pdf',
              },
            ],
          }));
          console.log('[email] Admin copy sent to ' + adminEmail);
        } catch (adminErr) {
          console.error(
            '[email] ADMIN_EMAIL_FAILED to ' + adminEmail + ':',
            adminErr instanceof Error ? adminErr.message : adminErr,
          );
          // Don't fail the whole operation for admin copy failure
        }
      }
      return { success: true };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(
        `[email] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        lastError,
      );
      if (attempt < MAX_RETRIES)
        await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return { success: false, error: lastError };
}

export async function generateAndSendInvoice(orderId: string): Promise<{
  success: boolean;
  invoiceNumber?: string;
  emailSent?: boolean;
  error?: string;
}> {
  try {
    console.log('[invoice] Generating invoice for order: ' + orderId);
    const { pdfBuffer, invoiceData, invoiceNumber } =
      await generateInvoicePDF(orderId);
    console.log(
      `[invoice] PDF generated: ${invoiceNumber} (${pdfBuffer.length} bytes)`,
    );

    const emailResult = await sendInvoiceEmail({
      to: invoiceData.customerEmail,
      customerName: invoiceData.customerName,
      orderNumber: invoiceData.orderNumber,
      invoiceNumber,
      total: invoiceData.total.toFixed(2).replace('.', ','),
      paymentMethod: invoiceData.paymentMethod,
      pdfBuffer,
      sendAdminCopy: true,
      orderId,
    });

    // Create an order note
    try {
      await prisma.orderNote.create({
        data: {
          orderId,
          note: emailResult.success
            ? `Rechnung ${invoiceNumber} per E-Mail an ${invoiceData.customerEmail} gesendet.`
            : `Rechnung ${invoiceNumber} generiert, E-Mail fehlgeschlagen: ${emailResult.error}`,
          author: 'system',
        },
      });
    } catch (e) {
      console.warn('[invoice] Could not create order note:', e);
    }

    return {
      success: true,
      invoiceNumber,
      emailSent: emailResult.success,
      error: emailResult.success ? undefined : emailResult.error,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[invoice] generateAndSendInvoice failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}
