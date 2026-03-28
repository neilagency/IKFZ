import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/db';

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

    // For now, mark payment as completed (simulated gateway)
    // In production, this would redirect to PayPal/Mollie/Stripe
    const { prisma } = await import('@/lib/db');
    await prisma.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: 'completed',
        paidAt: new Date(),
        transactionId: `SIM-${Date.now().toString(36).toUpperCase()}`,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'processing',
        datePaid: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    );
  }
}
