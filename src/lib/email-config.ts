/**
 * Centralized Email Configuration
 * ================================
 * Single source of truth for SMTP settings, company info, and email defaults.
 * All email files import from here instead of reading env vars independently.
 */

// ── SMTP Settings ──

function getSmtpPass(): string {
  if (process.env.SMTP_PASS_B64) {
    return Buffer.from(process.env.SMTP_PASS_B64, 'base64').toString('utf-8');
  }
  return process.env.SMTP_PASS || '';
}

export const smtp = {
  host: process.env.SMTP_HOST || 'smtp.titan.email',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  user: process.env.SMTP_USER || 'info@ikfzdigitalzulassung.de',
  pass: getSmtpPass(),
  get configured() { return !!this.pass; },
} as const;

// ── Email Addresses ──

export const emailFrom = process.env.EMAIL_FROM || 'info@ikfzdigitalzulassung.de';
export const emailFromName = process.env.EMAIL_FROM_NAME || 'iKFZ Digital Zulassung';
export const adminEmail = process.env.ADMIN_EMAIL || 'info@ikfzdigitalzulassung.de';

// ── Contact Info ──

export const contact = {
  email: process.env.CONTACT_EMAIL || 'info@ikfzdigitalzulassung.de',
  phone: process.env.CONTACT_PHONE || '015224999190',
  phoneDisplay: process.env.CONTACT_PHONE_DISPLAY || '01522 4999190',
  whatsapp: process.env.CONTACT_WHATSAPP || '4915224999190',
} as const;

// ── Company Info ──

export const company = {
  name: 'iKFZ Digital Zulassung UG',
  nameFull: 'iKFZ Digital Zulassung UG (haftungsbeschränkt)',
  nameFullAscii: 'iKFZ Digital Zulassung UG (haftungsbeschraenkt)',
  street: 'Gerhard-Küchen-Str. 14',
  streetAscii: 'Gerhard-Kuechen-Str. 14',
  zip: '45141',
  city: 'Essen',
  address: 'Gerhard-Küchen-Str. 14, 45141 Essen',
  addressAscii: 'Gerhard-Kuechen-Str. 14, 45141 Essen',
  website: 'www.ikfzdigitalzulassung.de',
  iban: 'DE70 3002 0900 5320 8804 65',
  googleReviewUrl: 'https://g.page/r/Cd3tHbWRE-frEAE/review',
} as const;

// ── Site URL ──

export const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ikfzdigitalzulassung.de';

// ── Design Tokens ──

export const emailColors = {
  primary: '#00a85a',       // Brand green (matches website)
  primaryDark: '#008a4a',   // Darker green for borders/accents
  headerBg: '#16191d',      // Dark header (dark-900)
  headerAccent: '#00a85a',  // Green accent stripe on header
  white: '#ffffff',
  bodyBg: '#f7f8fa',        // Outer page bg
  cardBg: '#ffffff',        // Content card bg
  lightGray: '#f8fafc',     // Table/section bg
  border: '#e5e7eb',        // Standard border
  lightGreen: '#f0fdf4',    // Help box bg
  greenBorder: '#bbf7d0',   // Help box border
  greenText: '#166534',     // Help box text
  textDark: '#1a1a1a',      // Primary text
  textBody: '#333333',      // Body text
  textGray: '#64748b',      // Secondary text
  textMuted: '#777777',     // Muted labels
  footerGray: '#999999',    // Footer text
  yellowBg: '#fefce8',      // Review box bg
  yellowBorder: '#fde68a',  // Review box border
  yellowText: '#854d0e',    // Review box text
  blueBg: '#eff6ff',        // Info box bg
  blueBorder: '#bfdbfe',    // Info box border
  blueText: '#1e40af',      // Info box text
} as const;

// ── Transporter Factory ──

export async function createEmailTransporter() {
  const nodemailer = await import('nodemailer');
  return nodemailer.default.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: false },
    logger: process.env.SMTP_DEBUG === 'true',
    debug: process.env.SMTP_DEBUG === 'true',
  });
}

export function createEmailTransporterSync() {
  // eslint-disable-next-line
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: false },
  });
}

// ── Common Email Footer HTML ──

export function emailFooterHtml(includeUnsubscribe = false, unsubscribeUrl?: string): string {
  return `
    <div style="text-align:center;padding:25px 20px;color:${emailColors.footerGray};font-size:12px;line-height:1.6;">
      <p style="margin:0 0 4px;">${company.nameFull}</p>
      <p style="margin:0 0 4px;">${company.address}</p>
      <p style="margin:0;">Tel.: ${contact.phoneDisplay} · E-Mail: ${contact.email}</p>
      <p style="margin:8px 0 0;"><a href="https://${company.website}" style="color:${emailColors.primary};text-decoration:none;font-weight:600;">${company.website}</a></p>
      ${includeUnsubscribe && unsubscribeUrl ? `<p style="margin-top:12px;"><a href="${unsubscribeUrl}" style="color:${emailColors.footerGray};text-decoration:underline;">Vom Newsletter abmelden</a></p>` : ''}
    </div>`;
}

// ── Common Help Box HTML ──

export function emailHelpBoxHtml(): string {
  return `
    <div style="background:${emailColors.lightGreen};border:1px solid ${emailColors.greenBorder};border-radius:12px;padding:20px;margin:25px 0 0;">
      <p style="margin:0 0 10px;font-weight:700;color:${emailColors.greenText};font-size:14px;">Brauchen Sie Hilfe?</p>
      <p style="margin:4px 0;color:${emailColors.textBody};font-size:14px;">📞 <a href="tel:+49${contact.phone}" style="color:${emailColors.primary};text-decoration:none;font-weight:600;">${contact.phoneDisplay}</a></p>
      <p style="margin:4px 0;color:${emailColors.textBody};font-size:14px;">💬 <a href="https://wa.me/${contact.whatsapp}" style="color:${emailColors.primary};text-decoration:none;font-weight:600;">WhatsApp Chat starten</a></p>
      <p style="margin:4px 0;color:${emailColors.textBody};font-size:14px;">✉️ <a href="mailto:${contact.email}" style="color:${emailColors.primary};text-decoration:none;font-weight:600;">${contact.email}</a></p>
    </div>`;
}

// ── Common Header HTML ──

export function emailHeaderHtml(title: string): string {
  return `
    <div style="background:${emailColors.headerBg};border-radius:12px 12px 0 0;padding:0;overflow:hidden;">
      <div style="height:4px;background:${emailColors.primary};"></div>
      <div style="padding:30px;text-align:center;">
        <img src="${siteUrl}/logo.webp" alt="${company.name}" style="max-height:40px;margin-bottom:14px;" />
        <h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;letter-spacing:-0.3px;">${title}</h1>
      </div>
    </div>`;
}

// ── CTA Button HTML ──

export function emailButtonHtml(text: string, href: string): string {
  return `
    <div style="text-align:center;margin:30px 0;">
      <a href="${href}" style="display:inline-block;background:${emailColors.primary};color:#fff;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;">${text}</a>
    </div>`;
}

// ── Detail Table Row HTML ──

export function emailTableRow(label: string, value: string, isTotal = false): string {
  if (isTotal) {
    return `<tr style="border-top:2px solid ${emailColors.primary};">
      <td style="padding:12px 0 6px;font-size:16px;font-weight:800;color:${emailColors.primary};">${label}</td>
      <td style="padding:12px 0 6px;font-size:16px;font-weight:800;color:${emailColors.primary};text-align:right;">${value}</td>
    </tr>`;
  }
  return `<tr>
    <td style="padding:6px 0;color:${emailColors.textMuted};font-size:13px;">${label}</td>
    <td style="padding:6px 0;font-weight:600;text-align:right;font-size:13px;">${value}</td>
  </tr>`;
}

// ── Master Email Template Wrapper ──

/**
 * Wraps content in the unified brand template.
 * All emails should use this wrapper for consistent look & feel.
 */
export function emailTemplate(opts: {
  title: string;
  body: string;
  includeUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:${emailColors.textDark};max-width:600px;margin:0 auto;padding:20px;background:${emailColors.bodyBg};">

${emailHeaderHtml(opts.title)}

<div style="background:${emailColors.cardBg};border:1px solid ${emailColors.border};border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  ${opts.body}
</div>

${emailFooterHtml(opts.includeUnsubscribe, opts.unsubscribeUrl)}

</body>
</html>`;
}

// ── From field ──

export function emailFromField(): string {
  return `"${emailFromName}" <${emailFrom}>`;
}

// ── Standard mail options for better deliverability ──

/**
 * Build standard mail options with proper headers to avoid spam.
 * Always includes: from, replyTo, List-Unsubscribe (for campaigns), and MIME headers.
 */
export function buildMailOptions(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
  unsubscribeUrl?: string;
  replyTo?: string;
  isBulk?: boolean;
}) {
  const headers: Record<string, string> = {};

  // Only add bulk headers for campaign/marketing emails
  if (opts.isBulk) {
    headers['Precedence'] = 'bulk';
    if (opts.unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${opts.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
  }

  return {
    from: emailFromField(),
    to: opts.to,
    replyTo: opts.replyTo || emailFrom,
    subject: opts.subject,
    html: opts.html,
    text: opts.text || stripHtml(opts.html),
    ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    headers,
  };
}

/**
 * Strip HTML tags to produce a plain-text version of the email.
 * Spam filters prefer emails that include both HTML and plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&euro;/gi, '€')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
