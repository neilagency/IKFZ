/**
 * Mollie Payment Callback
 * =======================
 * GET /api/payment/callback/?orderId={orderId}
 *
 * User is redirected here after completing (or abandoning) Mollie payment.
 * Checks payment status and redirects to success or failure page.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getMolliePayment, getMollieOrderStatus } from '@/lib/payments';
import { triggerInvoiceEmail } from '@/lib/trigger-invoice';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  }

  try {
    // Find order and payment in DB
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order || !order.payment) {
      return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
    }

    // If payment is already paid (webhook fired first), redirect to success
    if (order.payment.status === 'paid') {
      return NextResponse.redirect(
        new URL(`/bestellung-erfolgreich/?order=${order.id}`, request.url),
      );
    }

    // If payment failed, redirect to failure
    if (order.payment.status === 'failed') {
      return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
    }

    // Payment still pending — check Mollie API directly
    const transactionId = order.payment.transactionId;
    if (!transactionId || (!transactionId.startsWith('tr_') && !transactionId.startsWith('ord_'))) {
      return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
    }

    const isOrder = transactionId.startsWith('ord_');
    const molliePayment = isOrder
      ? await getMollieOrderStatus(transactionId)
      : await getMolliePayment(transactionId);

    if (molliePayment.status === 'paid' || molliePayment.status === 'authorized' || molliePayment.status === 'completed') {
      const paidAt = molliePayment.paidAt ? new Date(molliePayment.paidAt) : new Date();

      // Update DB (webhook might not have fired yet)
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'paid',
          paidAt,
          gatewayResponse: JSON.stringify(molliePayment),
        },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'processing',
          datePaid: paidAt,
        },
      });

      // Update invoice status to paid
      await prisma.invoice.updateMany({
        where: { orderId, status: { not: 'paid' } },
        data: { status: 'paid', paidAt, transactionId, paymentMethod: molliePayment.method || 'mollie' },
      });

      // Create audit trail OrderNote
      await prisma.orderNote.create({
        data: {
          orderId,
          note: `Zahlung bestätigt via Mollie Callback: ${transactionId} (${molliePayment.status})`,
          author: 'system',
        },
      });

      // Trigger invoice email (deduplicated)
      triggerInvoiceEmail(orderId).catch((err) =>
        console.error('[payment-callback] Invoice email error:', err),
      );

      return NextResponse.redirect(
        new URL(`/bestellung-erfolgreich/?order=${order.id}`, request.url),
      );
    }

    if (molliePayment.status === 'open' || molliePayment.status === 'pending') {
      // Bank transfer or still processing — show success with pending note
      return NextResponse.redirect(
        new URL(`/bestellung-erfolgreich/?order=${order.id}&pending=1`, request.url),
      );
    }

    // failed, canceled, expired
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: 'failed',
        gatewayResponse: JSON.stringify(molliePayment),
      },
    });
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'failed' },
    });

    // Create audit trail OrderNote for failure
    await prisma.orderNote.create({
      data: {
        orderId,
        note: `Zahlung fehlgeschlagen via Mollie Callback: ${transactionId} (${molliePayment.status})`,
        author: 'system',
      },
    });

    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  } catch (error) {
    console.error('[payment-callback] Error:', error);
    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  }
}
