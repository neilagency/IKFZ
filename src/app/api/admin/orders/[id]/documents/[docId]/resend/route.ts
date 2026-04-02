/**
 * Resend Document Email API
 * ==========================
 * POST /api/admin/orders/[id]/documents/[docId]/resend – Resend document email
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';
import { sendDocumentEmail } from '@/lib/document-email';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string; docId: string }> };

export async function POST(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id: orderId, docId } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, billingEmail: true, billingFirstName: true, billingLastName: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    if (!order.billingEmail) {
      return NextResponse.json({ error: 'Keine E-Mail-Adresse vorhanden' }, { status: 400 });
    }

    const doc = await prisma.orderDocument.findUnique({
      where: { id: docId },
    });

    if (!doc || doc.orderId !== orderId) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    // Read PDF buffer if file exists
    let pdfBuffer: Buffer | undefined;
    const filePath = path.join(process.cwd(), 'public', doc.fileUrl);
    if (fs.existsSync(filePath) && doc.fileName.toLowerCase().endsWith('.pdf')) {
      pdfBuffer = fs.readFileSync(filePath);
    }

    const customerName = [order.billingFirstName, order.billingLastName].filter(Boolean).join(' ') || 'Kunde';

    const result = await sendDocumentEmail({
      to: order.billingEmail,
      customerName,
      orderNumber: parseInt(order.orderNumber || '0', 10),
      fileName: doc.fileName,
      downloadToken: doc.token,
      documentId: doc.id,
      pdfBuffer,
    });

    if (result.success) {
      await prisma.orderNote.create({
        data: {
          orderId,
          note: `Dokument-E-Mail erneut gesendet: ${doc.fileName} an ${order.billingEmail}`,
          author: 'Admin',
        },
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error || 'E-Mail-Versand fehlgeschlagen' }, { status: 500 });
    }
  } catch (error) {
    console.error('Resend document email error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
