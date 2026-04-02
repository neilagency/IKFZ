/**
 * Public Invoice Email API
 * =========================
 * POST /api/send-invoice – Generate PDF and send invoice email
 *
 * Body: { orderId: string }
 * Used by checkout flow after successful payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAndSendInvoice } from '@/lib/invoice';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const result = await generateAndSendInvoice(orderId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        invoiceNumber: result.invoiceNumber,
        message: 'Invoice email sent',
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send invoice' },
        { status: 500 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[send-invoice] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
