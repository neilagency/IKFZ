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
  primary: '#0D5581',
  white: '#ffffff',
  lightGray: '#f8fafc',
  lightGreen: '#f0fdf4',
  greenBorder: '#bbf7d0',
  textDark: '#1a1a1a',
  textGray: '#64748b',
  footerGray: '#999',
  bodyBg: '#f4f6f9',
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
    <div style="text-align:center;padding:20px;color:${emailColors.footerGray};font-size:12px;">
      <p>${company.nameFull}</p>
      <p>${company.address}</p>
      <p>Tel.: ${contact.phoneDisplay} · E-Mail: ${contact.email} · Web: ${company.website}</p>
      ${includeUnsubscribe && unsubscribeUrl ? `<p style="margin-top:12px;"><a href="${unsubscribeUrl}" style="color:${emailColors.footerGray};">Vom Newsletter abmelden</a></p>` : ''}
    </div>`;
}

// ── Common Help Box HTML ──

export function emailHelpBoxHtml(): string {
  return `
    <div style="background:${emailColors.lightGreen};border:1px solid ${emailColors.greenBorder};border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:600;color:#166534;">Brauchen Sie Hilfe?</p>
      <p style="margin:4px 0;color:#333;font-size:14px;">📞 <a href="tel:+49${contact.phone}" style="color:${emailColors.primary};text-decoration:none;">${contact.phoneDisplay}</a></p>
      <p style="margin:4px 0;color:#333;font-size:14px;">💬 <a href="https://wa.me/${contact.whatsapp}" style="color:${emailColors.primary};text-decoration:none;">WhatsApp</a></p>
      <p style="margin:4px 0;color:#333;font-size:14px;">✉️ <a href="mailto:${contact.email}" style="color:${emailColors.primary};text-decoration:none;">${contact.email}</a></p>
    </div>`;
}

// ── Common Header HTML ──

export function emailHeaderHtml(title: string): string {
  return `
    <div style="background:${emailColors.primary};border-radius:12px 12px 0 0;padding:30px;text-align:center;">
      <img src="${siteUrl}/logo.webp" alt="${company.name}" style="max-height:40px;margin-bottom:12px;" />
      <h1 style="color:#fff;font-size:20px;margin:0;">${title}</h1>
    </div>`;
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
}) {
  const headers: Record<string, string> = {
    'X-Mailer': `${company.name} Mailer`,
    'X-Priority': '3',
    'Precedence': 'bulk',
  };

  if (opts.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${opts.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
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
