/**
 * Mollie Webhook Handler
 * ======================
 * POST /api/webhooks/mollie/
 *
 * Called by Mollie when a payment status changes.
 * Mollie sends the payment ID as form-encoded POST data.
 * We fetch the actual status from Mollie's API (secure by design).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getMolliePayment } from '@/lib/payments';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Mollie sends id as application/x-www-form-urlencoded
    const formData = await request.formData();
    const paymentId = formData.get('id') as string;

    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 },
      );
    }

    // Fetch actual payment status from Mollie API (secure verification)
    const molliePayment = await getMolliePayment(paymentId);

    // Get orderId from payment metadata
    const orderId = molliePayment.metadata?.orderId;
    if (!orderId) {
      console.error('[mollie-webhook] No orderId in payment metadata:', paymentId);
      return NextResponse.json({ error: 'No orderId in metadata' }, { status: 400 });
    }

    // Find the order and payment in DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      console.error('[mollie-webhook] Order not found:', orderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Map Mollie status to our status and update DB
    const mollieStatus = molliePayment.status;

    if (mollieStatus === 'paid') {
      // Payment successful
      if (order.payment && order.payment.status !== 'paid') {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'paid',
            paidAt: molliePayment.paidAt ? new Date(molliePayment.paidAt) : new Date(),
            transactionId: paymentId,
            gatewayResponse: JSON.stringify(molliePayment),
          },
        });
      }
      if (order.status !== 'processing' && order.status !== 'completed') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'processing',
            datePaid: molliePayment.paidAt ? new Date(molliePayment.paidAt) : new Date(),
            transactionId: paymentId,
          },
        });
      }
      console.log('[mollie-webhook] Payment successful:', paymentId, 'Order:', orderId);
    } else if (
      mollieStatus === 'failed' ||
      mollieStatus === 'canceled' ||
      mollieStatus === 'expired'
    ) {
      // Payment failed
      if (order.payment && order.payment.status === 'pending') {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'failed',
            gatewayResponse: JSON.stringify(molliePayment),
          },
        });
      }
      if (order.status === 'pending') {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'failed' },
        });
      }
      console.log('[mollie-webhook] Payment failed:', mollieStatus, paymentId, 'Order:', orderId);
    } else {
      // open, pending, authorized — no action needed yet
      console.log('[mollie-webhook] Payment status:', mollieStatus, paymentId, 'Order:', orderId);
    }

    // Mollie expects a 200 response
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('[mollie-webhook] Error:', error);
    // Return 200 to prevent Mollie from retrying on application errors
    // (Mollie retries on 4xx/5xx responses)
    return new NextResponse(null, { status: 200 });
  }
}
