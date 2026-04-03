import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/invoices - List all invoices
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const status = req.nextUrl.searchParams.get('status') || '';
  const search = req.nextUrl.searchParams.get('search') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') || '20')));

  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search } },
      { billingName: { contains: search } },
      { billingEmail: { contains: search } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        amount: true,
        currency: true,
        issuedAt: true,
        paidAt: true,
        billingName: true,
        billingEmail: true,
        billingAddress: true,
        orderId: true,
        createdAt: true,
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    invoices,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/admin/invoices - Create invoice for an order
export async function POST(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: 'orderId erforderlich' }, { status: 400 });

    // Check if invoice already exists
    const existing = await prisma.invoice.findUnique({ where: { orderId } });
    if (existing) {
      return NextResponse.json({ error: 'Rechnung existiert bereits', invoice: existing }, { status: 409 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });

    // Generate sequential invoice number
    const currentYear = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `RE-${currentYear}` } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    let counter = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
      if (match) counter = parseInt(match[1], 10) + 1;
    }
    const invoiceNumber = `RE-${currentYear}-${String(counter).padStart(4, '0')}`;

    const billingName = `${order.billingFirstName || ''} ${order.billingLastName || ''}`.trim() || 'Kunde';
    const items = order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.total }));
    if (order.paymentFee > 0) {
      items.push({ name: `Zahlungsgebühr (${order.paymentMethodTitle || 'Sonstige'})`, quantity: 1, price: order.paymentFee, total: order.paymentFee });
    }

    const invoice = await prisma.invoice.create({
      data: {
        orderId,
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

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error: any) {
    console.error('[invoices/POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/invoices - Update invoice
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const invoice = await prisma.invoice.update({
      where: { id: data.id },
      data: {
        status: data.status,
        notes: data.notes,
        paidAt: data.status === 'paid' ? new Date() : undefined,
      },
    });
    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
