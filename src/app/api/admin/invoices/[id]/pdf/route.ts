/**
 * Admin Invoice PDF Endpoint
 * ==========================
 * GET /api/admin/invoices/[id]/pdf/
 *
 * Generates and returns an invoice PDF for download.
 * [id] is the orderId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { generateInvoicePDF } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const { id: orderId } = await params;

  if (!orderId) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    const { pdfBuffer, invoiceNumber } = await generateInvoicePDF(orderId);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('[admin-invoice-pdf] Error:', message);
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
