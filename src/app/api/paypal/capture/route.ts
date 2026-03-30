/**
 * PayPal Capture Endpoint
 * =======================
 * GET /api/paypal/capture/?token={paypalOrderId}&PayerID={payerId}
 *
 * PayPal redirects here after the user approves payment.
 * Captures the payment, updates DB, redirects to success/failure page.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { capturePayPalOrder } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const paypalOrderId = request.nextUrl.searchParams.get('token');

  if (!paypalOrderId) {
    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  }

  try {
    // Find payment by PayPal order ID (stored as externalPaymentId and transactionId)
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { externalPaymentId: paypalOrderId },
          { transactionId: paypalOrderId },
        ],
      },
      include: { order: true },
    });

    if (!payment || !payment.order) {
      console.error('[paypal-capture] Payment not found for PayPal order:', paypalOrderId);
      return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
    }

    // Idempotency: if already captured, just redirect to success
    if (payment.status === 'paid') {
      return NextResponse.redirect(
        new URL(`/bestellung-erfolgreich/?order=${payment.orderId}`, request.url),
      );
    }

    // Capture the PayPal order
    const captureResult = await capturePayPalOrder(paypalOrderId);

    if (captureResult.status === 'COMPLETED') {
      // Update Payment with capture ID (needed for refunds)
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          transactionId: captureResult.captureId,
          captureId: captureResult.captureId,
          gatewayResponse: JSON.stringify(captureResult),
        },
      });

      // Update Order
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'processing',
          datePaid: new Date(),
          transactionId: captureResult.captureId,
        },
      });

      console.log(
        '[paypal-capture] Payment captured:',
        captureResult.captureId,
        'Order:',
        payment.orderId,
      );

      return NextResponse.redirect(
        new URL(`/bestellung-erfolgreich/?order=${payment.orderId}`, request.url),
      );
    }

    // Capture not completed
    console.error('[paypal-capture] Unexpected status:', captureResult.status);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        gatewayResponse: JSON.stringify(captureResult),
      },
    });
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'failed' },
    });

    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  } catch (error) {
    console.error('[paypal-capture] Error:', error);
    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  }
}
