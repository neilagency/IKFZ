import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/invoices/generate-all - Generate invoices for all orders without one
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    // Find all orders that don't have an invoice yet
    const ordersWithoutInvoice = await prisma.order.findMany({
      where: { invoice: null },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        billingFirstName: true,
        billingLastName: true,
        billingEmail: true,
        billingAddress1: true,
        billingCity: true,
        billingPostcode: true,
        billingCountry: true,
        paymentMethodTitle: true,
        paymentMethod: true,
        paymentFee: true,
        createdAt: true,
        items: { select: { name: true, quantity: true, price: true, total: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (ordersWithoutInvoice.length === 0) {
      return NextResponse.json({ message: 'Alle Bestellungen haben bereits Rechnungen', created: 0, total: 0 });
    }

    // Find the highest existing invoice number to continue the sequence
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let counter = 1;
    const currentYear = new Date().getFullYear();
    if (lastInvoice?.invoiceNumber) {
      // Parse RE-YYYY-NNNN or INV-XXXXX format
      const match = lastInvoice.invoiceNumber.match(/(\d{4,})$/);
      if (match) counter = parseInt(match[1], 10) + 1;
    }

    let created = 0;
    for (const order of ordersWithoutInvoice) {
      const invoiceNumber = `RE-${currentYear}-${String(counter).padStart(4, '0')}`;
      const billingName = `${order.billingFirstName || ''} ${order.billingLastName || ''}`.trim() || 'Kunde';

      // Build items JSON
      const items = order.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
      }));
      // Add payment fee as line item if present
      if (order.paymentFee && order.paymentFee > 0) {
        items.push({
          name: `Zahlungsgebühr (${order.paymentMethodTitle || order.paymentMethod || 'Sonstige'})`,
          quantity: 1,
          price: order.paymentFee,
          total: order.paymentFee,
        });
      }

      await prisma.invoice.create({
        data: {
          orderId: order.id,
          invoiceNumber,
          status: 'issued',
          amount: order.total,
          currency: 'EUR',
          billingName,
          billingEmail: order.billingEmail || '',
          billingAddress: [order.billingAddress1, order.billingPostcode, order.billingCity].filter(Boolean).join(', '),
          items: JSON.stringify(items),
        },
      });

      counter++;
      created++;
    }

    return NextResponse.json({
      message: `${created} Rechnungen erfolgreich erstellt`,
      created,
      total: ordersWithoutInvoice.length,
    });
  } catch (error: any) {
    console.error('[generate-all] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
