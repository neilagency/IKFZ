/**
 * Public Document Download API
 * =============================
 * GET /api/documents/[id]/download?token=<token>
 *
 * Token-secured endpoint for customers to download order documents.
 * Referenced by document-email.ts and konto/bestellungen/[id] page.
 *
 * If the physical file is missing but the document belongs to an order
 * with an invoice, the PDF is regenerated on-the-fly so downloads
 * keep working even after redeployments that don't preserve uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { generateInvoicePDF } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token erforderlich' }, { status: 401 });
  }

  try {
    const document = await prisma.orderDocument.findUnique({
      where: { id },
      include: { order: { select: { id: true, invoice: { select: { id: true } } } } },
    });

    if (!document || document.token !== token) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Link' }, { status: 403 });
    }

    const filePath = path.join(process.cwd(), 'public', document.fileUrl);
    let fileBuffer: Buffer;
    let contentType: string;

    if (fs.existsSync(filePath)) {
      fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(document.fileName).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };
      contentType = mimeTypes[ext] || 'application/octet-stream';
    } else if (
      document.fileName.toLowerCase().endsWith('.pdf') &&
      document.order?.invoice
    ) {
      // Invoice PDF missing on disk — regenerate on-the-fly
      const { pdfBuffer } = await generateInvoicePDF(document.orderId);
      fileBuffer = Buffer.from(pdfBuffer);
      contentType = 'application/pdf';
    } else {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[document-download] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
