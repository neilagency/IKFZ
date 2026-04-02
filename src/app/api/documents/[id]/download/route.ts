/**
 * Public Document Download API
 * =============================
 * GET /api/documents/[id]/download?token=<token>
 *
 * Token-secured endpoint for customers to download order documents.
 * Referenced by document-email.ts and konto/bestellungen/[id] page.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

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
    });

    if (!document || document.token !== token) {
      return NextResponse.json({ error: 'Ungültiger oder abgelaufener Link' }, { status: 403 });
    }

    const filePath = path.join(process.cwd(), 'public', document.fileUrl);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(document.fileName).toLowerCase();

    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
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
