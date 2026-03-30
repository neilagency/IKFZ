import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';
import prisma from '@/lib/db';
import {
  createMolliePayment,
  isMollieMethod,
  getCheckoutMollieMethod,
} from '@/lib/payments';
import { createPayPalOrder } from '@/lib/paypal';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://ikfzdigitalzulassung.de';

export async function POST(request: NextRequest) {
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

    // Build order items
    const items = [
      {
        name: orderItems.selectedService ?? orderItems.productName,
        quantity: 1,
        price: orderItems.basePrice,
        total: orderItems.basePrice,
      },
      ...(orderItems.addons ?? []).map(
        (addon: { label: string; price: number }) => ({
          name: addon.label,
          quantity: 1,
          price: addon.price,
          total: addon.price,
        })
      ),
    ];

    // Add payment fee as line item if applicable
    if (paymentFee > 0) {
      items.push({
        name: `Zahlungsgebühr (${paymentMethodTitles[paymentMethod] ?? paymentMethod})`,
        quantity: 1,
        price: paymentFee,
        total: paymentFee,
      });
    }

    // ── 1. Create Order in DB (status: pending) ──
    const order = await createOrder({
      productName: orderItems.productName,
      serviceData: JSON.stringify(orderItems.formData),
      total: grandTotal,
      subtotal: orderItems.total,
      paymentMethod,
      paymentMethodTitle: paymentMethodTitles[paymentMethod] ?? paymentMethod,
      paymentFee: paymentFee ?? 0,
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

    // ── 2. Create payment with the appropriate gateway ──
    try {
      if (paymentMethod === 'paypal') {
        // ── PayPal Flow ──
        const paypalResult = await createPayPalOrder({
          orderId: order.id,
          orderNumber: order.orderNumber!,
          amount: grandTotal,
          description: `Bestellung ${order.orderNumber}`,
          returnUrl: `${SITE_URL}/api/paypal/capture/`,
          cancelUrl: `${SITE_URL}/zahlung-fehlgeschlagen/`,
        });

        // Store PayPal order ID for capture lookup
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: { transactionId: paypalResult.paypalOrderId },
        });

        return NextResponse.json({
          success: true,
          checkoutUrl: paypalResult.approvalUrl,
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      } else if (isMollieMethod(paymentMethod)) {
        // ── Mollie Flow (creditcard, applepay, klarna, sepa) ──
        const mollieMethod = getCheckoutMollieMethod(paymentMethod)!;

        const mollieResult = await createMolliePayment({
          orderId: order.id,
          orderNumber: order.orderNumber!,
          amount: grandTotal,
          description: `Bestellung ${order.orderNumber}`,
          method: mollieMethod,
          redirectUrl: `${SITE_URL}/api/payment/callback/?orderId=${order.id}`,
          webhookUrl: `${SITE_URL}/api/webhooks/mollie/`,
        });

        // Store Mollie payment ID for webhook/callback lookup
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: { transactionId: mollieResult.paymentId },
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
