/**
 * PayPal Webhook Handler
 * ======================
 * POST /api/payment/paypal/webhook/
 *
 * Called by PayPal when a payment event occurs.
 * Acts as a safety net for cases where the capture callback didn't fire
 * or the user closed the browser mid-redirect.
 *
 * Configure in PayPal Developer Dashboard → Webhooks:
 *   URL: https://ikfzdigitalzulassung.de/api/payment/paypal/webhook/
 *   Events: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED
 *
 * Env var: PAYPAL_WEBHOOK_ID – The webhook ID from PayPal dashboard (for signature verification)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { triggerInvoiceEmail } from '@/lib/trigger-invoice';

export const dynamic = 'force-dynamic';

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';
const PAYPAL_BASE_URL =
  PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

/**
 * Verify PayPal webhook signature via their API.
 * Returns true if the webhook is authentic.
 */
async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  if (!PAYPAL_WEBHOOK_ID || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.warn('[paypal-webhook] Webhook verification skipped — credentials not configured');
    return false;
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  // Get OAuth token
  const tokenRes = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    console.error('[paypal-webhook] Token fetch failed:', tokenRes.status);
    return false;
  }

  const { access_token } = await tokenRes.json();

  // Verify the webhook signature
  const verifyRes = await fetch(
    `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo') || '',
        cert_url: headers.get('paypal-cert-url') || '',
        transmission_id: headers.get('paypal-transmission-id') || '',
        transmission_sig: headers.get('paypal-transmission-sig') || '',
        transmission_time: headers.get('paypal-transmission-time') || '',
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    },
  );

  if (!verifyRes.ok) {
    console.error('[paypal-webhook] Signature verification request failed:', verifyRes.status);
    return false;
  }

  const verifyData = await verifyRes.json();
  return verifyData.verification_status === 'SUCCESS';
}

export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    // Always return 200 to prevent PayPal from disabling the webhook
    return NextResponse.json({ received: true }, { status: 200 });
  }

  let event: {
    event_type: string;
    resource: {
      id?: string;
      custom_id?: string;
      status?: string;
      amount?: { value?: string; currency_code?: string };
      supplementary_data?: {
        related_ids?: { order_id?: string };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('[paypal-webhook] Invalid JSON body');
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Verify webhook signature (log warning but don't block in case of misconfiguration)
  if (PAYPAL_WEBHOOK_ID) {
    const verified = await verifyWebhookSignature(request.headers, rawBody);
    if (!verified) {
      console.error('[paypal-webhook] Signature verification FAILED — rejecting event:', event.event_type);
      return NextResponse.json({ received: true }, { status: 200 });
    }
  }

  const eventType = event.event_type;
  const resource = event.resource;

  console.log('[paypal-webhook] Event received:', eventType, 'Resource ID:', resource?.id);

  try {
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        await handleCaptureCompleted(resource);
        break;
      }
      case 'PAYMENT.CAPTURE.DENIED': {
        await handleCaptureDenied(resource);
        break;
      }
      case 'PAYMENT.CAPTURE.REFUNDED': {
        await handleCaptureRefunded(resource);
        break;
      }
      default:
        console.log('[paypal-webhook] Unhandled event type:', eventType);
    }
  } catch (error) {
    console.error('[paypal-webhook] Error handling event:', eventType, error);
  }

  // Always return 200 so PayPal doesn't disable the webhook
  return NextResponse.json({ received: true }, { status: 200 });
}

/**
 * Find a payment record by PayPal capture ID or custom_id (our orderId).
 */
async function findPaymentByPayPalResource(resource: {
  id?: string;
  custom_id?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
}) {
  const captureId = resource.id;
  const orderId = resource.custom_id;

  // Try captureId first (most reliable after capture flow)
  if (captureId) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { captureId },
          { transactionId: captureId },
          { externalPaymentId: captureId },
        ],
      },
      include: { order: true },
    });
    if (payment) return payment;
  }

  // Fallback to custom_id (our orderId, set during order creation)
  if (orderId) {
    const payment = await prisma.payment.findFirst({
      where: { orderId },
      include: { order: true },
    });
    if (payment) return payment;
  }

  // Try via related PayPal order ID
  const relatedOrderId = resource.supplementary_data?.related_ids?.order_id;
  if (relatedOrderId) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { externalPaymentId: relatedOrderId },
          { transactionId: relatedOrderId },
        ],
      },
      include: { order: true },
    });
    if (payment) return payment;
  }

  return null;
}

async function handleCaptureCompleted(resource: { id?: string; custom_id?: string; amount?: { value?: string } }) {
  const payment = await findPaymentByPayPalResource(resource);
  if (!payment) {
    console.warn('[paypal-webhook] CAPTURE.COMPLETED — no matching payment for:', resource.id);
    return;
  }

  // Idempotency: skip if already paid
  if (payment.status === 'paid') {
    console.log('[paypal-webhook] CAPTURE.COMPLETED — already paid, skipping:', payment.orderId);
    return;
  }

  const captureId = resource.id || payment.captureId || '';

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'paid',
      paidAt: new Date(),
      captureId,
      transactionId: captureId,
    },
  });

  await prisma.order.update({
    where: { id: payment.orderId },
    data: {
      status: 'processing',
      datePaid: new Date(),
      transactionId: captureId,
    },
  });

  await prisma.invoice.updateMany({
    where: { orderId: payment.orderId, status: { not: 'paid' } },
    data: { status: 'paid', paidAt: new Date(), transactionId: captureId || '', paymentMethod: 'paypal' },
  });

  await prisma.orderNote.create({
    data: {
      orderId: payment.orderId,
      note: `PayPal-Webhook: Zahlung bestätigt. Capture ID: ${captureId}`,
      author: 'system',
    },
  });

  console.log('[paypal-webhook] CAPTURE.COMPLETED — order updated:', payment.orderId);

  // Trigger invoice email (if not already sent by capture callback)
  triggerInvoiceEmail(payment.orderId).catch((err) =>
    console.error('[paypal-webhook] Invoice email error:', err),
  );
}

async function handleCaptureDenied(resource: { id?: string; custom_id?: string }) {
  const payment = await findPaymentByPayPalResource(resource);
  if (!payment) {
    console.warn('[paypal-webhook] CAPTURE.DENIED — no matching payment for:', resource.id);
    return;
  }

  // Don't overwrite a successful payment
  if (payment.status === 'paid') return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'failed' },
  });

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: 'failed' },
  });

  await prisma.orderNote.create({
    data: {
      orderId: payment.orderId,
      note: `PayPal-Webhook: Zahlung abgelehnt. Capture ID: ${resource.id}`,
      author: 'system',
    },
  });

  console.log('[paypal-webhook] CAPTURE.DENIED — order failed:', payment.orderId);
}

async function handleCaptureRefunded(resource: { id?: string; custom_id?: string; amount?: { value?: string } }) {
  const payment = await findPaymentByPayPalResource(resource);
  if (!payment) {
    console.warn('[paypal-webhook] CAPTURE.REFUNDED — no matching payment for:', resource.id);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'refunded' },
  });

  await prisma.order.update({
    where: { id: payment.orderId },
    data: { status: 'refunded' },
  });

  await prisma.orderNote.create({
    data: {
      orderId: payment.orderId,
      note: `PayPal-Webhook: Rückerstattung erhalten. Betrag: ${resource.amount?.value ?? '?'} EUR`,
      author: 'system',
    },
  });

  console.log('[paypal-webhook] CAPTURE.REFUNDED — order refunded:', payment.orderId);
}
