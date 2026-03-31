/**
 * Professional German Invoice HTML Template
 * ==========================================
 * Generates styled HTML for jsPDF or Puppeteer → PDF conversion.
 * All amounts in EUR, German locale, MwSt 19%.
 */

const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://ikfzdigitalzulassung.de';

/* ── Types ───────────────────────────────────── */
export interface InvoiceData {
  // Invoice
  invoiceNumber: string;
  invoiceDate: string; // formatted DD.MM.YYYY
  dueDate?: string;

  // Order
  orderNumber: number | string;
  orderDate: string; // formatted DD.MM.YYYY HH:mm
  paymentMethod: string;
  paymentStatus: string;
  transactionId?: string;

  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerStreet?: string;
  customerPostcode?: string;
  customerCity?: string;

  // Service details
  productName: string;
  serviceData: Record<string, any>;

  // Uploaded files (URLs)
  uploadedFiles?: Record<string, { name: string; url: string }>;

  // Line items
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentFee: number;
}

/* ── Helpers ──────────────────────────────────── */
export function eur(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* German labels for common serviceData keys */
const SERVICE_FIELD_LABELS: Record<string, string> = {
  kennzeichen: 'Kennzeichen',
  fin: 'FIN (Fahrzeug-Identnr.)',
  sicherheitscode: 'Sicherheitscode',
  stadtKreis: 'Stadt / Kreis',
  codeVorne: 'Code vorne',
  codeHinten: 'Code hinten',
  reservierung: 'Reservierung',
  service: 'Dienstleistung',
  serviceLabel: 'Dienstleistung',
  ausweis: 'Ausweisnummer',
  evbNummer: 'eVB-Nummer',
  kennzeichenWahl: 'Kennzeichen-Wahl',
  wunschkennzeichen: 'Wunschkennzeichen',
  kennzeichenPin: 'Kennzeichen-PIN',
  kennzeichenBestellen: 'Kennzeichen bestellen',
  kontoinhaber: 'Kontoinhaber',
  iban: 'IBAN',
  formType: 'Formulartyp',
  productId: 'Produkt-ID',
  productPrice: 'Produktpreis',
};

/* Keys to skip in service detail output */
const SKIP_KEYS = new Set([
  'productId',
  'productPrice',
  'formType',
  'uploadedFiles',
]);

/* ── Main Template ────────────────────────────── */
export function generateInvoiceHTML(data: InvoiceData): string {
  const logoUrl = `${SITE_URL}/logo.webp`;

  // Build service details rows
  const serviceRows = Object.entries(data.serviceData)
    .filter(([key]) => !SKIP_KEYS.has(key))
    .filter(([, val]) => val !== '' && val !== null && val !== undefined && val !== false)
    .map(([key, val]) => {
      const label = SERVICE_FIELD_LABELS[key] || key;
      let value = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (value === 'true' || value === 'ja') value = 'Ja';
      if (value === 'false' || value === 'nein') value = 'Nein';
      return `<tr><td class="sd-label">${escapeHtml(label)}</td><td class="sd-value">${escapeHtml(value)}</td></tr>`;
    })
    .join('\n');

  // Build line items rows
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${eur(item.price)}</td>
        <td class="right">${eur(item.total)}</td>
      </tr>`,
    )
    .join('\n');

  // Build uploaded files section
  let filesSection = '';
  if (data.uploadedFiles && Object.keys(data.uploadedFiles).length > 0) {
    const fileEntries = Object.entries(data.uploadedFiles)
      .map(([key, file]) => {
        const label = SERVICE_FIELD_LABELS[key] || key;
        const fullUrl = file.url.startsWith('http')
          ? file.url
          : `${SITE_URL}${file.url}`;
        return `
          <div class="file-item">
            <span class="file-label">${escapeHtml(label)}:</span>
            <a href="${escapeHtml(fullUrl)}" target="_blank">${escapeHtml(file.name)}</a>
          </div>`;
      })
      .join('\n');
    filesSection = `
      <div class="section">
        <h3>📎 Hochgeladene Dokumente</h3>
        <div class="files-list">${fileEntries}</div>
      </div>`;
  }

  // Payment status badge
  const statusColor =
    data.paymentStatus === 'paid'
      ? '#22c55e'
      : data.paymentStatus === 'pending'
        ? '#f59e0b'
        : '#ef4444';
  const statusLabel =
    data.paymentStatus === 'paid'
      ? 'Bezahlt'
      : data.paymentStatus === 'pending'
        ? 'Ausstehend'
        : data.paymentStatus === 'failed'
          ? 'Fehlgeschlagen'
          : data.paymentStatus;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rechnung ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      line-height: 1.5;
      background: #fff;
      padding: 40px 50px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 35px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0D5581;
    }
    .header-left { max-width: 220px; }
    .header-left img { width: 200px; height: auto; margin-bottom: 8px; }
    .company-info { font-size: 11px; color: #555; line-height: 1.6; }
    .header-right { text-align: right; }
    .invoice-title {
      font-size: 28px;
      font-weight: 800;
      color: #0D5581;
      margin-bottom: 6px;
      letter-spacing: -0.5px;
    }
    .invoice-number { font-size: 16px; color: #333; font-weight: 600; }
    .invoice-date { font-size: 12px; color: #777; margin-top: 4px; }
    .info-grid { display: flex; gap: 25px; margin-bottom: 30px; }
    .info-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px 20px;
    }
    .info-box h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #0D5581;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #0D5581;
    }
    .info-box p { font-size: 12px; color: #333; margin-bottom: 3px; }
    .info-box .label { color: #777; font-size: 11px; }
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    .items-table thead th {
      background: #0D5581;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      text-align: left;
    }
    .items-table thead th:first-child { border-radius: 8px 0 0 0; }
    .items-table thead th:last-child { border-radius: 0 8px 0 0; }
    .items-table tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }
    .items-table tbody tr:last-child td { border-bottom: none; }
    .items-table tbody tr:nth-child(even) { background: #f8fafc; }
    .items-table .center { text-align: center; }
    .items-table .right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 300px; border-collapse: collapse; }
    .totals-table td { padding: 6px 14px; font-size: 12px; }
    .totals-table .label-cell { color: #555; text-align: left; }
    .totals-table .value-cell { text-align: right; font-weight: 600; }
    .totals-table .total-row td {
      font-size: 16px;
      font-weight: 800;
      color: #0D5581;
      padding-top: 10px;
      border-top: 2px solid #0D5581;
    }
    .section { margin-bottom: 25px; }
    .section h3 {
      font-size: 14px;
      font-weight: 700;
      color: #0D5581;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
    }
    .service-table { width: 100%; border-collapse: collapse; }
    .service-table td {
      padding: 7px 14px;
      font-size: 12px;
      border-bottom: 1px solid #f0f0f0;
    }
    .service-table .sd-label { color: #555; font-weight: 600; width: 200px; }
    .service-table .sd-value { color: #1a1a1a; }
    .files-list { padding-left: 5px; }
    .file-item { margin-bottom: 6px; font-size: 12px; }
    .file-label { color: #555; font-weight: 600; }
    .file-item a { color: #0D5581; text-decoration: none; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 10px;
      color: #999;
      line-height: 1.8;
    }
    .footer strong { color: #555; }
    .notes {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 14px 20px;
      margin-bottom: 25px;
      font-size: 12px;
      color: #166534;
    }
    .notes strong { color: #15803d; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <img src="${logoUrl}" alt="iKFZ Digital Zulassung" />
      <div class="company-info">
        iKFZ Digital Zulassung UG (haftungsbeschränkt)<br>
        Gerhard-Küchen-Str. 14<br>
        45141 Essen<br>
        E-Mail: info@ikfzdigitalzulassung.de<br>
        Tel.: 01522 4999190<br>
        Web: www.ikfzdigitalzulassung.de
      </div>
    </div>
    <div class="header-right">
      <div class="invoice-title">RECHNUNG</div>
      <div class="invoice-number">${escapeHtml(data.invoiceNumber)}</div>
      <div class="invoice-date">Rechnungsdatum: ${escapeHtml(data.invoiceDate)}</div>
      <div class="invoice-date">Bestellnummer: #${data.orderNumber}</div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-box">
      <h3>👤 Rechnungsadresse</h3>
      <p><strong>${escapeHtml(data.customerName)}</strong></p>
      ${data.customerStreet ? `<p>${escapeHtml(data.customerStreet)}</p>` : ''}
      ${
        data.customerPostcode || data.customerCity
          ? `<p>${escapeHtml([data.customerPostcode, data.customerCity].filter(Boolean).join(' '))}</p>`
          : ''
      }
      <p class="label">Deutschland</p>
      <p style="margin-top:6px;">${escapeHtml(data.customerEmail)}</p>
      <p>${escapeHtml(data.customerPhone)}</p>
    </div>
    <div class="info-box">
      <h3>💳 Zahlungsinformationen</h3>
      <p><span class="label">Methode:</span> ${escapeHtml(data.paymentMethod)}</p>
      <p>
        <span class="label">Status:</span>
        <span class="status-badge" style="background:${statusColor}">${statusLabel}</span>
      </p>
      ${data.transactionId ? `<p><span class="label">Transaktions-ID:</span><br><span style="font-size:10px;word-break:break-all;">${escapeHtml(data.transactionId)}</span></p>` : ''}
      <p><span class="label">Bestelldatum:</span> ${escapeHtml(data.orderDate)}</p>
    </div>
  </div>

  <!-- LINE ITEMS -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Beschreibung</th>
        <th class="center">Menge</th>
        <th class="right">Einzelpreis</th>
        <th class="right">Gesamt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="totals">
    <table class="totals-table">
      <tr>
        <td class="label-cell">Zwischensumme</td>
        <td class="value-cell">${eur(data.subtotal)}</td>
      </tr>
      ${
        data.paymentFee > 0
          ? `<tr>
        <td class="label-cell">Zahlungsgebühr</td>
        <td class="value-cell">${eur(data.paymentFee)}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="label-cell">inkl. ${data.taxRate}% MwSt.</td>
        <td class="value-cell">${eur(data.taxAmount)}</td>
      </tr>
      <tr class="total-row">
        <td class="label-cell">Gesamtbetrag</td>
        <td class="value-cell">${eur(data.total)}</td>
      </tr>
    </table>
  </div>

  <!-- PAYMENT NOTE -->
  ${
    data.paymentStatus === 'paid'
      ? `<div class="notes">
    <strong>✅ Zahlung erhalten</strong> — Vielen Dank! Ihre Bestellung wird umgehend bearbeitet.
    Sie erhalten alle Dokumente innerhalb von 24 Stunden per E-Mail.
  </div>`
      : `<div class="notes" style="background:#fefce8;border-color:#fde68a;color:#854d0e;">
    <strong>⏳ Zahlung ausstehend</strong> — Ihre Bestellung wurde registriert. 
    Sobald Ihre Zahlung eingegangen ist, beginnen wir mit der Bearbeitung.
  </div>`
  }

  <!-- SERVICE DETAILS -->
  ${
    serviceRows
      ? `<div class="section">
    <h3>🛠 Dienstleistungsdetails</h3>
    <table class="service-table">
      ${serviceRows}
    </table>
  </div>`
      : ''
  }

  <!-- UPLOADED FILES -->
  ${filesSection}

  <!-- FOOTER -->
  <div class="footer">
    <p><strong>iKFZ Digital Zulassung UG (haftungsbeschränkt)</strong> — Gerhard-Küchen-Str. 14, 45141 Essen</p>
    <p>Tel.: 01522 4999190 · E-Mail: info@ikfzdigitalzulassung.de · Web: www.ikfzdigitalzulassung.de</p>
    <p style="margin-top:8px;">Vielen Dank für Ihr Vertrauen! Bei Fragen erreichen Sie uns jederzeit per Telefon oder WhatsApp.</p>
    <p style="margin-top:4px;font-size:9px;color:#bbb;">Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.</p>
  </div>

</body>
</html>`;
}
