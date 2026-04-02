import { NextRequest, NextResponse } from 'next/server';
import { createOrder, getPaymentGatewayByCheckoutId } from '@/lib/db';
import prisma from '@/lib/db';
import {
  createMolliePayment,
  createMollieOrder,
  isMollieMethod,
  getCheckoutMollieMethod,
} from '@/lib/payments';
import { createPayPalOrder } from '@/lib/paypal';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { paymentLog } from '@/lib/payment-logger';
import { triggerInvoiceEmail } from '@/lib/trigger-invoice';
import { generateInvoiceToken } from '@/lib/invoice-token';
import { checkoutDirectSchema, formatZodErrors } from '@/lib/validations';
import crypto from 'crypto';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://ikfzdigitalzulassung.de';

/* ── Payment surcharges — fetched from DB at runtime ── */

/* ── Fetch prices from DB (single source of truth) ───────────── */
async function getPricesFromDB(
  productSlug: string,
  selectedService?: string,
): Promise<{ basePrice: number | null; addonPriceMap: Record<string, number> }> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug, isActive: true },
    select: { price: true, options: true },
  });
  if (!product) return { basePrice: null, addonPriceMap: {} };

  const opts: Record<string, any> = product.options ? JSON.parse(product.options) : {};

  // For Anmeldung: price depends on which service variant was selected
  let basePrice = product.price;
  if (selectedService && Array.isArray(opts.services)) {
    const svc = (opts.services as Array<{ label: string; price: number }>).find(
      (s) => s.label === selectedService,
    );
    if (svc) basePrice = svc.price;
  }

  // Build addon price map from DB options
  const addonPriceMap: Record<string, number> = {};
  if (opts.kennzeichen_reserviert?.price) {
    const p = opts.kennzeichen_reserviert.price as number;
    addonPriceMap['Kennzeichen reserviert'] = p;
    addonPriceMap['Wunschkennzeichen Reservierung'] = p;
    if (opts.kennzeichen_reserviert.label) addonPriceMap[opts.kennzeichen_reserviert.label] = p;
  }
  if (opts.kennzeichen_bestellen?.price) {
    const p = opts.kennzeichen_bestellen.price as number;
    addonPriceMap['Kennzeichen bestellen'] = p;
    if (opts.kennzeichen_bestellen.label) addonPriceMap[opts.kennzeichen_bestellen.label] = p;
  }
  if (opts.reservierung?.price) {
    const p = opts.reservierung.price as number;
    addonPriceMap['Kennzeichenreservierung (1 Jahr)'] = p;
    if (opts.reservierung.label) addonPriceMap[opts.reservierung.label] = p;
  }

  return { basePrice, addonPriceMap };
}

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
    const rawBody = await request.json();

    // ── Zod Validation ──
    const parsed = checkoutDirectSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(formatZodErrors(parsed.error), { status: 400 });
    }
    const body = parsed.data;

    const {
      firstName,
      lastName,
      email,
      phone,
      street: address,
      city,
      postcode,
      paymentMethod,
      customerNote,
      couponCode: rawCouponCode,
    } = body;

    // Map from Zod schema field names to orderItems
    const orderItems = {
      productSlug: body.productId === 'anmeldung' ? 'auto-online-anmelden' : 'fahrzeugabmeldung',
      productName: body.productName || (body.productId === 'anmeldung' ? 'Fahrzeug online anmelden' : 'Fahrzeugabmeldung'),
      selectedService: body.serviceData?.serviceLabel,
      addons: body.addons,
      formData: body.serviceData,
    };

    // ── Server-side price recalculation via Database ──
    // Prices are always fetched from DB — never trust frontend values
    const productSlug = orderItems.productSlug;
    if (!productSlug) {
      return NextResponse.json(
        { error: 'Unbekannter Service. Bitte versuchen Sie es erneut.' },
        { status: 400 }
      );
    }

    const { basePrice: serverBasePrice, addonPriceMap } = await getPricesFromDB(
      productSlug,
      orderItems.selectedService,
    );

    if (serverBasePrice === null) {
      return NextResponse.json(
        { error: 'Unbekannter Service. Bitte versuchen Sie es erneut.' },
        { status: 400 }
      );
    }

    const serviceName = orderItems.selectedService ?? orderItems.productName;

    // ── Validate payment method against DB ──
    const gateway = await getPaymentGatewayByCheckoutId(paymentMethod);
    if (!gateway) {
      return NextResponse.json(
        { error: 'Ungültige oder deaktivierte Zahlungsmethode.' },
        { status: 400 }
      );
    }
    const serverPaymentFee = gateway.fee;

    // Build order items with DB-verified prices
    const items = [
      {
        name: serviceName,
        quantity: 1,
        price: serverBasePrice,
        total: serverBasePrice,
      },
    ];

    let serverSubtotal = serverBasePrice;

    // Validate and price addons from DB catalogue
    if (orderItems.addons && Array.isArray(orderItems.addons)) {
      for (const addon of orderItems.addons) {
        const addonPrice = addonPriceMap[addon.label];
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

    // ── Server-side coupon validation (matches Project A logic) ──
    let discountAmount = 0;
    let validatedCouponId: string | null = null;
    const couponCode = (rawCouponCode || '').trim().toUpperCase();

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      const now = new Date();
      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ error: 'Ungültiger oder inaktiver Gutscheincode.' }, { status: 400 });
      }
      if (coupon.startDate && now < coupon.startDate) {
        return NextResponse.json({ error: 'Gutschein ist noch nicht gültig.' }, { status: 400 });
      }
      if (coupon.endDate && now > coupon.endDate) {
        return NextResponse.json({ error: 'Gutschein ist abgelaufen.' }, { status: 400 });
      }
      if (coupon.maxUsageTotal > 0 && coupon.usageCount >= coupon.maxUsageTotal) {
        return NextResponse.json({ error: 'Gutschein wurde bereits vollständig eingelöst.' }, { status: 400 });
      }
      if (coupon.maxUsagePerUser > 0 && email) {
        const userUsage = await prisma.couponUsage.findUnique({
          where: { couponId_email: { couponId: coupon.id, email } },
        });
        if (userUsage) {
          return NextResponse.json({ error: 'Sie haben diesen Gutschein bereits verwendet.' }, { status: 400 });
        }
      }
      if (coupon.productSlugs) {
        const allowed = coupon.productSlugs.split(',').map((s: string) => s.trim()).filter(Boolean);
        const productSlug = orderItems.productSlug || '';
        if (allowed.length > 0 && productSlug && !allowed.includes(productSlug)) {
          return NextResponse.json({ error: 'Gutschein gilt nicht für dieses Produkt.' }, { status: 400 });
        }
      }
      if (coupon.minOrderValue > 0 && serverSubtotal < coupon.minOrderValue) {
        return NextResponse.json({
          error: `Mindestbestellwert: ${coupon.minOrderValue.toFixed(2).replace('.', ',')} €`,
        }, { status: 400 });
      }

      // Calculate discount
      if (coupon.discountType === 'percentage') {
        discountAmount = Math.round(serverSubtotal * coupon.discountValue / 100 * 100) / 100;
      } else {
        discountAmount = Math.min(coupon.discountValue, serverSubtotal);
      }
      validatedCouponId = coupon.id;
    }

    // Add discount as negative line item if applicable
    if (discountAmount > 0) {
      items.push({
        name: `Gutschein (${couponCode})`,
        quantity: 1,
        price: -discountAmount,
        total: -discountAmount,
      });
    }

    // Add payment fee as line item if applicable
    if (serverPaymentFee > 0) {
      items.push({
        name: `Zahlungsgebühr (${gateway.name})`,
        quantity: 1,
        price: serverPaymentFee,
        total: serverPaymentFee,
      });
    }

    const serverGrandTotal = Math.max(
      Math.round((serverSubtotal - discountAmount + serverPaymentFee) * 100) / 100,
      0,
    );

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

    // ── Customer upsert (matches Project A logic) ──
    const customer = email
      ? await prisma.customer.upsert({
          where: { email },
          update: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: serverGrandTotal },
          },
          create: {
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            phone: phone || '',
            billingCity: city || '',
            billingPostcode: postcode || '',
            billingAddress1: address || '',
            totalOrders: 1,
            totalSpent: serverGrandTotal,
          },
        })
      : null;

    // ── 1. Create Order in DB (status: pending) ──
    const order = await createOrder({
      productName: orderItems.productName,
      serviceData: JSON.stringify(orderItems.formData),
      total: serverGrandTotal,
      subtotal: serverSubtotal,
      paymentMethod,
      paymentMethodTitle: gateway.name,
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
      items: items.filter(i => i.price >= 0), // don't store discount as order item
    });

    // Link customer to order
    if (customer) {
      await prisma.order.update({
        where: { id: order.id },
        data: { customerId: customer.id, discountAmount, couponCode },
      });
    } else if (discountAmount > 0 || couponCode) {
      await prisma.order.update({
        where: { id: order.id },
        data: { discountAmount, couponCode },
      });
    }

    // Record coupon usage
    if (validatedCouponId && couponCode && email) {
      await Promise.all([
        prisma.couponUsage.create({
          data: { couponId: validatedCouponId, email, orderId: order.id },
        }),
        prisma.coupon.update({
          where: { id: validatedCouponId },
          data: { usageCount: { increment: 1 } },
        }),
      ]);
    }

    paymentLog.orderCreated({
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      total: String(serverGrandTotal),
      method: paymentMethod,
    });

    // ── FREE ORDER (coupon covers full amount) — skip payment gateway ──
    if (serverGrandTotal <= 0) {
      console.log(`[checkout] Order ${order.orderNumber} is free (coupon: ${couponCode}), skipping payment gateway`);

      await Promise.all([
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'processing' },
        }),
        prisma.payment.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'paid',
            transactionId: `FREE-${couponCode || 'COUPON'}`,
          },
        }),
      ]);

      // Send invoice email for free order
      triggerInvoiceEmail(order.id).catch((err) =>
        console.error('[checkout] Free order invoice email failed:', err),
      );

      return NextResponse.json({
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: '0.00',
      });
    }

    // ── 2. Create payment with the appropriate gateway ──
    try {
      if (paymentMethod === 'paypal') {
        // ── PayPal Flow ──
        const paypalResult = await createPayPalOrder({
          orderId: order.id,
          orderNumber: order.orderNumber!,
          amount: serverGrandTotal,
          description: serviceName,
          email,
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
        const mollieResult = await createMolliePayment({
          firstName,
          lastName,
          street: address,
          postcode,
          city,
          phone,
          email,
          paymentMethod: 'sepa',
          productId: orderItems.productSlug,
          amount: serverGrandTotal.toFixed(2),
          description: `Bestellung ${order.orderNumber}`,
          orderId: order.id,
          orderNumber: order.orderNumber!,
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

        // Get invoice number for redirect URL
        const sepaInvoice = await prisma.invoice.findFirst({
          where: { orderId: order.id },
          select: { invoiceNumber: true },
        });

        const invoiceUrl = sepaInvoice
          ? `/rechnung/${encodeURIComponent(sepaInvoice.invoiceNumber)}?order=${order.orderNumber}&token=${generateInvoiceToken(sepaInvoice.invoiceNumber)}`
          : undefined;

        return NextResponse.json({
          success: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          pendingPayment: true,
          invoiceUrl,
        });
      } else if (isMollieMethod(paymentMethod)) {
        // ── Mollie Flow (creditcard, applepay, klarna) ──
        const isKlarna = paymentMethod === 'klarna';

        const mollieResult = isKlarna
          ? await createMollieOrder({
              firstName,
              lastName,
              street: address,
              postcode,
              city,
              phone,
              email,
              paymentMethod,
              productId: orderItems.productSlug,
              amount: serverGrandTotal.toFixed(2),
              description: serviceName,
              orderId: order.id,
              orderNumber: order.orderNumber!,
              productName: serviceName,
              productPrice: serverSubtotal,
              paymentFee: serverPaymentFee,
              discountAmount,
              couponCode,
            })
          : await createMolliePayment({
              firstName,
              lastName,
              street: address,
              postcode,
              city,
              phone,
              email,
              paymentMethod,
              productId: orderItems.productSlug,
              amount: serverGrandTotal.toFixed(2),
              description: `Bestellung ${order.orderNumber}`,
              orderId: order.id,
              orderNumber: order.orderNumber!,
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
