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
import { getMolliePayment } from '@/lib/payments';

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
    if (!transactionId || !transactionId.startsWith('tr_')) {
      return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
    }

    const molliePayment = await getMolliePayment(transactionId);

    if (molliePayment.status === 'paid') {
      // Update DB (webhook might not have fired yet)
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'paid',
          paidAt: molliePayment.paidAt ? new Date(molliePayment.paidAt) : new Date(),
          gatewayResponse: JSON.stringify(molliePayment),
        },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'processing',
          datePaid: molliePayment.paidAt ? new Date(molliePayment.paidAt) : new Date(),
        },
      });
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

    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  } catch (error) {
    console.error('[payment-callback] Error:', error);
    return NextResponse.redirect(new URL('/zahlung-fehlgeschlagen/', request.url));
  }
}
