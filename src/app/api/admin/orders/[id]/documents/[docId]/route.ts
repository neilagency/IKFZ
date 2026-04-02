/**
 * Single Document API
 * ====================
 * DELETE /api/admin/orders/[id]/documents/[docId] – Delete a document
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id: orderId, docId } = await ctx.params;

  try {
    const doc = await prisma.orderDocument.findUnique({
      where: { id: docId },
    });

    if (!doc || doc.orderId !== orderId) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'public', doc.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete DB record
    await prisma.orderDocument.delete({ where: { id: docId } });

    // Add note
    await prisma.orderNote.create({
      data: {
        orderId,
        note: `Dokument gelöscht: ${doc.fileName}`,
        author: 'Admin',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
