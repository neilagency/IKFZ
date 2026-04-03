import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCustomerSession } from '@/lib/customer-auth';
import { generateInvoiceToken } from '@/lib/invoice-token';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { customerId: session.id },
          { billingEmail: session.email.toLowerCase() },
        ],
      },
      include: {
        items: true,
        payment: true,
        invoice: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Bestellung nicht gefunden.' },
        { status: 404 }
      );
    }

    // Attach pdfToken so the customer can download the invoice PDF
    const invoice = order.invoice
      ? { ...order.invoice, pdfToken: generateInvoiceToken(order.invoice.invoiceNumber) }
      : null;

    return NextResponse.json({ order: { ...order, invoice } });
  } catch (error) {
    console.error('Customer order detail error:', error);
    return NextResponse.json(
      { error: 'Bestellung konnte nicht geladen werden.' },
      { status: 500 }
    );
  }
}
