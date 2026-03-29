import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendOrderMessageEmail } from '@/lib/order-message-email';
import { getAdminSession, unauthorized } from '@/lib/auth';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

/** GET /api/admin/orders/[id]/messages – list messages for order */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const messages = await prisma.orderMessage.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST /api/admin/orders/[id]/messages – create message with optional attachments */
export async function POST(request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, billingEmail: true, billingFirstName: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    const formData = await request.formData();
    const messageText = formData.get('message') as string | null;

    if (!messageText || typeof messageText !== 'string' || !messageText.trim()) {
      return NextResponse.json({ error: 'Nachricht ist erforderlich' }, { status: 400 });
    }

    // Handle file uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'messages');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const attachments: { filename: string; url: string; path: string }[] = [];
    const files = formData.getAll('files') as File[];

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximal ${MAX_FILES} Dateien erlaubt` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) continue;

      if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Dateityp nicht erlaubt: ${file.type}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Datei zu groß: ${file.name} (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
          { status: 400 }
        );
      }

      const prefix = crypto.randomBytes(8).toString('hex');
      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${prefix}-${safeFilename}`;
      const filePath = path.join(uploadDir, filename);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      attachments.push({
        filename: file.name,
        url: `/uploads/messages/${filename}`,
        path: filePath,
      });
    }

    const message = await prisma.orderMessage.create({
      data: {
        orderId: id,
        sentBy: 'admin',
        message: messageText.trim(),
        attachments: attachments.length > 0
          ? JSON.stringify(attachments.map((a) => ({ filename: a.filename, url: a.url })))
          : '',
      },
    });

    // Send email notification
    if (order.billingEmail) {
      sendOrderMessageEmail({
        to: order.billingEmail,
        orderNumber: order.orderNumber || '',
        customerName: order.billingFirstName || undefined,
        message: messageText.trim(),
        attachments: attachments.map((a) => ({ filename: a.filename, path: a.path })),
      }).catch((err) => {
        console.error('Failed to send message email:', err);
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
