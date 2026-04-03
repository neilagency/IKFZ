/**
 * Resend Invoice API
 * ===================
 * POST /api/admin/orders/[id]/resend-invoice – Resend invoice email
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';
import {
  smtp, siteUrl as SITE_URL, company, contact,
  createEmailTransporter, emailFromField,
} from '@/lib/email-config';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { invoice: true, items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    if (!order.invoice) {
      return NextResponse.json({ error: 'Keine Rechnung vorhanden' }, { status: 400 });
    }

    if (!order.billingEmail) {
      return NextResponse.json({ error: 'Keine E-Mail-Adresse vorhanden' }, { status: 400 });
    }

    if (!smtp.configured) {
      return NextResponse.json({ error: 'SMTP nicht konfiguriert' }, { status: 500 });
    }

    const transporter = await createEmailTransporter();

    const customerName = [order.billingFirstName, order.billingLastName].filter(Boolean).join(' ') || 'Kunde';

    const itemsHtml = (order.items || []).map(item =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">€${item.total.toFixed(2)}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:20px;background:#f4f6f9;">
<div style="background:#0D5581;border-radius:12px 12px 0 0;padding:30px;text-align:center;">
  <h1 style="color:#fff;font-size:20px;margin:0;">Rechnung #${order.invoice.invoiceNumber}</h1>
</div>
<div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:30px;">
  <p>Sehr geehrte/r <strong>${customerName}</strong>,</p>
  <p>anbei finden Sie Ihre Rechnung zur Bestellung <strong>#${order.orderNumber}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <thead><tr style="background:#f8fafc;">
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">Produkt</th>
      <th style="padding:8px;text-align:center;border-bottom:2px solid #e2e8f0;">Menge</th>
      <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;">Betrag</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
    <tfoot><tr>
      <td colspan="2" style="padding:8px;text-align:right;font-weight:bold;">Gesamt:</td>
      <td style="padding:8px;text-align:right;font-weight:bold;">€${order.total.toFixed(2)}</td>
    </tr></tfoot>
  </table>
  <p style="color:#64748b;font-size:13px;">Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
  <div style="text-align:center;margin:20px 0;">
    <a href="${SITE_URL}/konto" style="display:inline-block;background:#0D5581;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">Mein Konto</a>
  </div>
</div>
</body></html>`;

    await transporter.sendMail({
      from: emailFromField(),
      to: order.billingEmail,
      subject: `Rechnung #${order.invoice.invoiceNumber} – ${company.name}`,
      html,
    });

    // Add note
    await prisma.orderNote.create({
      data: {
        orderId: id,
        note: `Rechnung #${order.invoice.invoiceNumber} erneut gesendet an ${order.billingEmail}`,
        author: 'Admin',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Resend invoice error:', errMsg);
    return NextResponse.json({ error: `Fehler beim Senden: ${errMsg}` }, { status: 500 });
  }
}
