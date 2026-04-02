/**
 * Refund Endpoint
 * ===============
 * POST /api/payment/refund/
 *
 * Admin-authenticated endpoint to process full or partial refunds.
 * Detects the payment gateway (Mollie / PayPal) and calls the appropriate refund API.
 *
 * Request body:
 *   { orderId: string, amount?: number, reason?: string }
 *   - orderId: internal order ID
 *   - amount: optional partial refund amount in EUR (omit for full refund)
 *   - reason: optional note for the customer (max 255 chars)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { createMollieRefund } from '@/lib/payments';
import { refundPayPalCapture } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  let body: { orderId?: string; amount?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { orderId, amount, reason } = body;

  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found for this order' }, { status: 404 });
    }

    if (payment.status !== 'paid') {
      return NextResponse.json(
        { error: `Cannot refund payment with status: ${payment.status}` },
        { status: 400 },
      );
    }

    const refundAmount = amount ?? payment.amount;
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json({ error: 'Invalid refund amount' }, { status: 400 });
    }

    const refundAmountStr = refundAmount.toFixed(2);
    const gateway = payment.gateway || '';

    let refundId: string;
    let refundStatus: string;

    if (gateway === 'mollie') {
      // Mollie refund — uses the Mollie payment ID (transactionId or externalPaymentId)
      const molliePaymentId = payment.transactionId || payment.externalPaymentId;
      if (!molliePaymentId) {
        return NextResponse.json({ error: 'No Mollie payment ID found' }, { status: 400 });
      }

      const result = await createMollieRefund(
        molliePaymentId,
        { currency: 'EUR', value: refundAmountStr },
        reason,
      );
      refundId = result.refundId;
      refundStatus = result.status;
    } else if (gateway === 'paypal') {
      // PayPal refund — uses the capture ID
      const captureId = payment.captureId || payment.transactionId;
      if (!captureId) {
        return NextResponse.json({ error: 'No PayPal capture ID found' }, { status: 400 });
      }

      const result = await refundPayPalCapture(
        captureId,
        { currency_code: 'EUR', value: refundAmountStr },
        reason,
      );
      refundId = result.refundId;
      refundStatus = result.status;
    } else {
      return NextResponse.json(
        { error: `Unsupported payment gateway: ${gateway || 'unknown'}` },
        { status: 400 },
      );
    }

    // Update payment status
    const isFullRefund = refundAmount >= payment.amount;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: isFullRefund ? 'refunded' : 'paid' },
    });

    // Update order status for full refunds
    if (isFullRefund) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'refunded' },
      });
    }

    // Create audit trail
    await prisma.orderNote.create({
      data: {
        orderId,
        note: `Rückerstattung: ${refundAmountStr} EUR via ${gateway}. Refund ID: ${refundId}${reason ? ` — ${reason}` : ''}`,
        author: 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      refundId,
      status: refundStatus,
      amount: refundAmountStr,
      gateway,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Refund failed';
    console.error('[refund] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
