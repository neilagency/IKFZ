/**
 * Mollie Webhook Handler
 * ======================
 * POST /api/payment/webhook/
 *
 * Called by Mollie when a payment status changes.
 * Mollie sends the payment ID as form-encoded POST data.
 * We fetch the actual status from Mollie's API (secure by design).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getMolliePayment, getMollieOrderStatus } from '@/lib/payments';
import { triggerInvoiceEmail } from '@/lib/trigger-invoice';
import { paymentLog } from '@/lib/payment-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Mollie sends id as application/x-www-form-urlencoded
    const formData = await request.formData();
    const paymentId = formData.get('id') as string;

    if (!paymentId || typeof paymentId !== 'string') {
      // CRITICAL: Always return 200 — Mollie treats non-2xx as "unreachable"
      // and may block future payment creation for this webhook URL
      console.error('[mollie-webhook] Missing payment ID in form data');
      return new NextResponse(null, { status: 200 });
    }

    // Fetch actual payment status from Mollie API (secure verification)
    // Handle both payment IDs (tr_) and order IDs (ord_ for Klarna)
    const isOrder = paymentId.startsWith('ord_');
    const molliePayment = isOrder
      ? await getMollieOrderStatus(paymentId)
      : await getMolliePayment(paymentId);

    // Get orderId from payment metadata
    const orderId = molliePayment.metadata?.orderId;
    if (!orderId) {
      console.error('[mollie-webhook] No orderId in payment metadata:', paymentId);
      return new NextResponse(null, { status: 200 });
    }

    // Find the order and payment in DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      console.error('[mollie-webhook] Order not found:', orderId);
      return new NextResponse(null, { status: 200 });
    }

    // Map Mollie status to our status and update DB
    const mollieStatus = molliePayment.status;
    const mollieMethod = molliePayment.method || (isOrder ? 'klarna' : 'unknown');

    // Payment successful: paid (regular), authorized (Klarna — payment guaranteed),
    // completed (Klarna — order fulfilled)
    if (mollieStatus === 'paid' || mollieStatus === 'authorized' || mollieStatus === 'completed') {
      const paidAt = molliePayment.paidAt ? new Date(molliePayment.paidAt) : new Date();

      if (order.payment && order.payment.status !== 'paid') {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'paid',
            paidAt,
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
            datePaid: paidAt,
            transactionId: paymentId,
          },
        });
      }

      // Update invoice status to paid
      await prisma.invoice.updateMany({
        where: { orderId, status: { not: 'paid' } },
        data: { status: 'paid', paidAt },
      });

      // Create audit trail OrderNote
      await prisma.orderNote.create({
        data: {
          orderId,
          note: `Mollie Zahlung ${mollieStatus}: ${paymentId} (${mollieMethod})`,
          author: 'system',
        },
      });

      console.log('[mollie-webhook] Payment successful:', mollieStatus, paymentId, 'Order:', orderId);

      // Trigger invoice email (deduplicated — safe if callback also triggers)
      triggerInvoiceEmail(orderId).then((result) => {
        paymentLog.emailTriggered({ orderId, success: result.success, error: result.error });
      }).catch((err) => console.error('[mollie-webhook] Invoice email error:', err));
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

      // Create audit trail OrderNote
      await prisma.orderNote.create({
        data: {
          orderId,
          note: `Mollie Zahlung ${mollieStatus}: ${paymentId} (${mollieMethod})${molliePayment.failureReason ? ` — ${molliePayment.failureReason}` : ''}`,
          author: 'system',
        },
      });

      console.log('[mollie-webhook] Payment failed:', mollieStatus, paymentId, 'Order:', orderId);
    } else {
      // open, pending — no action needed yet
      console.log('[mollie-webhook] Payment status:', mollieStatus, paymentId, 'Order:', orderId);
    }

    // Mollie expects a 200 response
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('[mollie-webhook] Error:', error);
    // Return 200 to prevent Mollie from retrying on application errors
    return new NextResponse(null, { status: 200 });
  }
}
