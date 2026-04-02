/**
 * Invoice PDF Download API
 * =========================
 * GET /api/invoice/[invoiceNumber]/pdf
 *
 * Generates and serves a PDF invoice using jsPDF.
 * The invoiceNumber must match /^INV-/ pattern.
 * Returns application/pdf with Content-Disposition: attachment.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateInvoicePDF } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ invoiceNumber: string }> };

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const { invoiceNumber } = await ctx.params;
  const decoded = decodeURIComponent(invoiceNumber);

  if (!decoded || decoded.length < 3) {
    return NextResponse.json({ error: 'Ungültige Rechnungsnummer' }, { status: 400 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: decoded },
      select: { orderId: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
    }

    const { pdfBuffer } = await generateInvoicePDF(invoice.orderId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rechnung-${encodeURIComponent(decoded)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[invoice-pdf] Error:', error);
    return NextResponse.json({ error: 'PDF-Generierung fehlgeschlagen' }, { status: 500 });
  }
}
