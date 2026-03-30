/**
 * Refund API (Mollie + PayPal)
 * =============================
 * POST /api/admin/orders/[id]/refund  – Execute refund
 * GET  /api/admin/orders/[id]/refund  – Get refund history
 *
 * Automatically detects the payment provider:
 *   - Mollie (tr_* transaction IDs)
 *   - PayPal (all other paid transactions)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createMollieRefund, getMollieRefunds } from '@/lib/payments';
import { refundPayPalCapture, getPayPalCaptureRefunds } from '@/lib/paypal';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** Determine payment provider from transaction ID and payment method */
function detectProvider(
  order: { paymentMethod: string | null; transactionId: string | null },
  payment: { transactionId: string | null; method: string; status: string; gateway: string | null; captureId: string | null } | null,
): { provider: 'mollie' | 'paypal'; transactionId: string } | null {
  // 1. Check payment record (gateway field takes priority)
  if (payment && payment.status === 'paid' && payment.transactionId) {
    if (payment.gateway === 'mollie' || payment.transactionId.startsWith('tr_')) {
      return { provider: 'mollie', transactionId: payment.transactionId };
    }
    if (
      payment.gateway === 'paypal' ||
      payment.method?.includes('paypal') ||
      order.paymentMethod === 'paypal'
    ) {
      return { provider: 'paypal', transactionId: payment.captureId || payment.transactionId };
    }
  }

  // 2. Fallback to order-level transactionId
  if (order.transactionId) {
    if (order.transactionId.startsWith('tr_')) {
      return { provider: 'mollie', transactionId: order.transactionId };
    }
    if (order.paymentMethod === 'paypal') {
      return { provider: 'paypal', transactionId: order.transactionId };
    }
  }

  return null;
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const { amount } = body; // optional: partial refund amount as string e.g. "10.00"

    // 1. Load order with payment
    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    // 2. Detect payment provider
    const providerInfo = detectProvider(order, order.payment);

    if (!providerInfo) {
      return NextResponse.json(
        { error: 'Keine gültige Zahlung gefunden. Refund erfordert eine bezahlte Mollie- oder PayPal-Transaktion.' },
        { status: 400 },
      );
    }

    const { provider, transactionId } = providerInfo;

    // 3. Determine refund amount
    const refundValue = amount
      ? parseFloat(amount).toFixed(2)
      : order.total.toFixed(2);

    if (isNaN(parseFloat(refundValue)) || parseFloat(refundValue) < 0) {
      return NextResponse.json({ error: 'Ungültiger Betrag' }, { status: 400 });
    }

    if (parseFloat(refundValue) > order.total) {
      return NextResponse.json(
        { error: `Betrag (€${refundValue}) übersteigt Bestellsumme (€${order.total.toFixed(2)})` },
        { status: 400 },
      );
    }

    const isFullRefund = parseFloat(refundValue) >= order.total;
    let refundResult: { refundId: string; status: string };

    // 4. For €0 orders, skip provider API
    if (parseFloat(refundValue) === 0) {
      refundResult = { refundId: 'zero-amount', status: 'refunded' };
    } else if (provider === 'mollie') {
      // ── Mollie Refund ──
      refundResult = await createMollieRefund(
        transactionId,
        { currency: 'EUR', value: refundValue },
        `Erstattung für Bestellung #${order.orderNumber}`,
      );
    } else {
      // ── PayPal Refund ──
      const paypalResult = await refundPayPalCapture(
        transactionId,
        { currency_code: 'EUR', value: refundValue },
        `Erstattung Bestellung #${order.orderNumber}`,
      );
      refundResult = {
        refundId: paypalResult.refundId,
        status: paypalResult.status === 'COMPLETED' ? 'refunded' : paypalResult.status.toLowerCase(),
      };
    }

    // 5. Update DB after success
    if (isFullRefund) {
      await prisma.order.update({
        where: { id },
        data: { status: 'refunded' },
      });
    }

    // Update payment status (one-to-one in Project B)
    if (order.payment) {
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: isFullRefund ? 'refunded' : 'partially_refunded' },
      });
    }

    // Update invoice status (Project B uses `status` not `paymentStatus`)
    await prisma.invoice.updateMany({
      where: { orderId: id },
      data: { status: isFullRefund ? 'refunded' : 'partially_refunded' },
    });

    // Add order note
    const providerLabel = provider === 'mollie' ? 'Mollie' : 'PayPal';
    await prisma.orderNote.create({
      data: {
        orderId: id,
        note: `${providerLabel} Erstattung ${isFullRefund ? '(Voll)' : '(Teil)'}: €${refundValue} – Refund-ID: ${refundResult.refundId} – Status: ${refundResult.status}`,
        author: 'System',
      },
    });

    return NextResponse.json({
      success: true,
      provider,
      refundId: refundResult.refundId,
      status: refundResult.status,
      amount: refundValue,
      isFullRefund,
    });
  } catch (error: any) {
    console.error('Refund error:', error);

    const errMessage = error?.message || '';
    let userMessage = 'Erstattung fehlgeschlagen';

    // Mollie-specific errors
    if (errMessage.includes('already been refunded')) {
      userMessage = 'Diese Zahlung wurde bereits vollständig erstattet';
    } else if (errMessage.includes('higher than')) {
      userMessage = 'Der Erstattungsbetrag ist höher als der verfügbare Betrag';
    } else if (errMessage.includes('not paid')) {
      userMessage = 'Diese Zahlung wurde noch nicht bezahlt';
    }
    // PayPal-specific errors
    else if (errMessage.includes('CAPTURE_FULLY_REFUNDED')) {
      userMessage = 'Diese PayPal-Zahlung wurde bereits vollständig erstattet';
    } else if (errMessage.includes('REFUND_AMOUNT_EXCEEDED')) {
      userMessage = 'Der Erstattungsbetrag übersteigt den verfügbaren PayPal-Betrag';
    } else if (errMessage.includes('REFUND_NOT_ALLOWED')) {
      userMessage = 'PayPal erlaubt keine Erstattung für diese Transaktion';
    } else if (errMessage) {
      userMessage = `Fehler: ${errMessage}`;
    }

    return NextResponse.json({ error: userMessage }, { status: 400 });
  }
}

/** GET – Fetch refund history */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const providerInfo = detectProvider(order, order.payment);
    if (!providerInfo) {
      return NextResponse.json({ refunds: [], provider: null });
    }

    const { provider, transactionId } = providerInfo;

    if (provider === 'mollie') {
      const refunds = await getMollieRefunds(transactionId);
      return NextResponse.json({ refunds, provider: 'mollie' });
    } else {
      const refunds = await getPayPalCaptureRefunds(transactionId);
      const normalized = refunds.map((r) => ({
        id: r.id,
        status: r.status === 'COMPLETED' ? 'refunded' : r.status.toLowerCase(),
        amount: { value: r.amount.value, currency: r.amount.currency_code },
        createdAt: r.create_time,
      }));
      return NextResponse.json({ refunds: normalized, provider: 'paypal' });
    }
  } catch (error) {
    console.error('Refund list error:', error);
    return NextResponse.json({ refunds: [], provider: null });
  }
}
