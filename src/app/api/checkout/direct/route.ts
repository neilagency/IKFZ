import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';
import prisma from '@/lib/db';
import {
  createMolliePayment,
  isMollieMethod,
  getCheckoutMollieMethod,
} from '@/lib/payments';
import { createPayPalOrder } from '@/lib/paypal';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { paymentLog } from '@/lib/payment-logger';
import { triggerInvoiceEmail } from '@/lib/trigger-invoice';
import crypto from 'crypto';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://ikfzdigitalzulassung.de';

/* ── Server-side price catalogue ────────────────────────────── */
const SERVICE_PRICES: Record<string, number> = {
  'Wiederzulassung': 99.70,
  'Neuwagen Zulassung': 99.70,
  'Ummeldung (Halterwechsel)': 119.70,
  'Neuzulassung (Gebrauchtwagen)': 124.70,
  'Fahrzeugabmeldung': 19.70,
};

const ADDON_PRICES: Record<string, number> = {
  'Kennzeichen reserviert': 24.70,
  'Kennzeichen bestellen': 29.70,
  'Wunschkennzeichen Reservierung': 4.70,
};

const PAYMENT_FEES: Record<string, number> = {
  paypal: 0,
  applepay: 0,
  creditcard: 0.50,
  klarna: 0,
  sepa: 0,
};

export async function POST(request: NextRequest) {
  // ── Rate Limiting ──
  const ip = getClientIP(request);
  const rl = rateLimit(ip, { maxRequests: 8, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.reset / 1000)) } },
    );
  }

  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      postcode,
      paymentMethod,
      customerNote,
      orderItems,
      paymentFee,
      grandTotal,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !paymentMethod || !orderItems) {
      return NextResponse.json(
        { error: 'Pflichtfelder fehlen' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      );
    }

    // Validate payment method
    const validMethods = ['paypal', 'applepay', 'creditcard', 'klarna', 'sepa'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Ungültige Zahlungsmethode' },
        { status: 400 }
      );
    }

    const paymentMethodTitles: Record<string, string> = {
      paypal: 'PayPal',
      applepay: 'Apple Pay',
      creditcard: 'Kreditkarte',
      klarna: 'Klarna',
      sepa: 'SEPA-Lastschrift',
    };

    // ── Server-side price recalculation ──
    // Never trust prices from frontend
    const serviceName = orderItems.selectedService ?? orderItems.productName;
    const serverBasePrice = SERVICE_PRICES[serviceName];
    if (serverBasePrice === undefined) {
      return NextResponse.json(
        { error: 'Unbekannter Service. Bitte versuchen Sie es erneut.' },
        { status: 400 }
      );
    }

    const serverPaymentFee = PAYMENT_FEES[paymentMethod] ?? 0;

    // Build order items with server-verified prices
    const items = [
      {
        name: serviceName,
        quantity: 1,
        price: serverBasePrice,
        total: serverBasePrice,
      },
    ];

    let serverSubtotal = serverBasePrice;

    // Validate and price addons from server catalogue
    if (orderItems.addons && Array.isArray(orderItems.addons)) {
      for (const addon of orderItems.addons) {
        const addonPrice = ADDON_PRICES[addon.label];
        if (addonPrice === undefined) {
          return NextResponse.json(
            { error: `Unbekanntes Zusatzprodukt: ${addon.label}` },
            { status: 400 }
          );
        }
        items.push({
          name: addon.label,
          quantity: 1,
          price: addonPrice,
          total: addonPrice,
        });
        serverSubtotal += addonPrice;
      }
    }

    // Add payment fee as line item if applicable
    if (serverPaymentFee > 0) {
      items.push({
        name: `Zahlungsgebühr (${paymentMethodTitles[paymentMethod] ?? paymentMethod})`,
        quantity: 1,
        price: serverPaymentFee,
        total: serverPaymentFee,
      });
    }

    const serverGrandTotal = Math.round((serverSubtotal + serverPaymentFee) * 100) / 100;

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = crypto.randomUUID();

    paymentLog.checkoutStart({
      orderId: '',
      orderNumber: 0,
      method: paymentMethod,
      amount: String(serverGrandTotal),
      email,
      ip,
    });

    // ── 1. Create Order in DB (status: pending) ──
    const order = await createOrder({
      productName: orderItems.productName,
      serviceData: JSON.stringify(orderItems.formData),
      total: serverGrandTotal,
      subtotal: serverSubtotal,
      paymentMethod,
      paymentMethodTitle: paymentMethodTitles[paymentMethod] ?? paymentMethod,
      paymentFee: serverPaymentFee,
      billingFirstName: firstName,
      billingLastName: lastName,
      billingEmail: email,
      billingPhone: phone,
      billingAddress1: address,
      billingCity: city,
      billingPostcode: postcode,
      billingCountry: 'DE',
      customerNote,
      items,
    });

    paymentLog.orderCreated({
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      total: String(serverGrandTotal),
      method: paymentMethod,
    });

    // ── 2. Create payment with the appropriate gateway ──
    try {
      if (paymentMethod === 'paypal') {
        // ── PayPal Flow ──
        const paypalResult = await createPayPalOrder({
          orderId: order.id,
          orderNumber: order.orderNumber!,
          amount: serverGrandTotal,
          description: `Bestellung ${order.orderNumber}`,
          returnUrl: `${SITE_URL}/api/paypal/capture/`,
          cancelUrl: `${SITE_URL}/zahlung-fehlgeschlagen/`,
        });

        // Store PayPal order ID and gateway info
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            gateway: 'paypal',
            externalPaymentId: paypalResult.paypalOrderId,
            transactionId: paypalResult.paypalOrderId,
            idempotencyKey,
          },
        });

        return NextResponse.json({
          success: true,
          checkoutUrl: paypalResult.approvalUrl,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      } else if (paymentMethod === 'sepa') {
        // ── SEPA: Mollie Bank Transfer — send invoice immediately ──
        const mollieMethod = getCheckoutMollieMethod(paymentMethod)!;
        const mollieResult = await createMolliePayment({
          orderId: order.id,
          orderNumber: order.orderNumber!,
          amount: serverGrandTotal,
          description: `Bestellung ${order.orderNumber}`,
          method: mollieMethod,
          redirectUrl: `${SITE_URL}/api/payment/callback/?orderId=${order.id}`,
          webhookUrl: `${SITE_URL}/api/webhooks/mollie/`,
        });

        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            gateway: 'mollie',
            externalPaymentId: mollieResult.paymentId,
            transactionId: mollieResult.paymentId,
            idempotencyKey,
          },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'on-hold', transactionId: mollieResult.paymentId },
        });

        // SEPA: send invoice email immediately (no redirect needed)
        triggerInvoiceEmail(order.id).catch((err) =>
          console.error('[checkout] SEPA invoice email failed:', err),
        );

        return NextResponse.json({
          success: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          pendingPayment: true,
        });
      } else if (isMollieMethod(paymentMethod)) {
        // ── Mollie Flow (creditcard, applepay, klarna) ──
        const mollieMethod = getCheckoutMollieMethod(paymentMethod)!;

        const mollieResult = await createMolliePayment({
          orderId: order.id,
          orderNumber: order.orderNumber!,
          amount: serverGrandTotal,
          description: `Bestellung ${order.orderNumber}`,
          method: mollieMethod,
          redirectUrl: `${SITE_URL}/api/payment/callback/?orderId=${order.id}`,
          webhookUrl: `${SITE_URL}/api/webhooks/mollie/`,
        });

        // Store Mollie payment ID and gateway info
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            gateway: 'mollie',
            externalPaymentId: mollieResult.paymentId,
            transactionId: mollieResult.paymentId,
            idempotencyKey,
          },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { transactionId: mollieResult.paymentId },
        });

        if (mollieResult.checkoutUrl) {
          return NextResponse.json({
            success: true,
            checkoutUrl: mollieResult.checkoutUrl,
            orderId: order.id,
            orderNumber: order.orderNumber,
          });
        } else {
          // Bank transfer: no checkout URL, Mollie emails bank details
          return NextResponse.json({
            success: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            pendingPayment: true,
          });
        }
      } else {
        return NextResponse.json(
          { error: 'Ungültige Zahlungsmethode' },
          { status: 400 }
        );
      }
    } catch (gatewayError) {
      console.error('Payment gateway error:', gatewayError);
      // Mark order as failed if gateway call fails
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'failed' },
      });
      await prisma.payment.updateMany({
        where: { orderId: order.id },
        data: { status: 'failed' },
      });
      return NextResponse.json(
        { error: 'Zahlungsanbieter nicht erreichbar. Bitte versuchen Sie es erneut.' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    );
  }
}
