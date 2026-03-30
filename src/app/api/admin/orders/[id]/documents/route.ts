/**
 * Admin Order Documents API
 * ==========================
 * POST /api/admin/orders/[id]/documents – Upload PDF + notify customer
 * GET  /api/admin/orders/[id]/documents – List documents for order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';
import { sendDocumentEmail } from '@/lib/document-email';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** GET – list documents for order */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const documents = await prisma.orderDocument.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST – upload document + optional email notification */
export async function POST(request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, billingEmail: true, billingFirstName: true, billingLastName: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sendEmail = formData.get('sendEmail') === 'true';

    if (!file || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Datei ist erforderlich' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Dateityp nicht erlaubt: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Datei zu groß (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 },
      );
    }

    // Save file
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const prefix = crypto.randomBytes(8).toString('hex');
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${prefix}-${safeFilename}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const token = crypto.randomBytes(32).toString('hex');

    const document = await prisma.orderDocument.create({
      data: {
        orderId: id,
        fileName: file.name,
        fileUrl: `/uploads/documents/${filename}`,
        fileSize: file.size,
        token,
      },
    });

    // Add note
    await prisma.orderNote.create({
      data: {
        orderId: id,
        note: `Dokument hochgeladen: ${file.name}${sendEmail ? ' (E-Mail gesendet)' : ''}`,
        author: 'Admin',
      },
    });

    // Send email notification if requested
    if (sendEmail && order.billingEmail) {
      const customerName = [order.billingFirstName, order.billingLastName].filter(Boolean).join(' ') || 'Kunde';
      sendDocumentEmail({
        to: order.billingEmail,
        customerName,
        orderNumber: parseInt(order.orderNumber || '0', 10),
        fileName: file.name,
        downloadToken: token,
        documentId: document.id,
        pdfBuffer: file.type === 'application/pdf' ? buffer : undefined,
      }).catch((err) => {
        console.error('Document email failed:', err);
      });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
