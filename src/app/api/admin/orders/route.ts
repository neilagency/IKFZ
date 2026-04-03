import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { sendCompletionEmail } from '@/lib/completion-email';

export const dynamic = 'force-dynamic';

// GET /api/admin/orders - List all orders
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const search = req.nextUrl.searchParams.get('search') || '';
  const status = req.nextUrl.searchParams.get('status') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { billingEmail: { contains: search } },
      { billingFirstName: { contains: search } },
      { billingLastName: { contains: search } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true, name: true, quantity: true, price: true, total: true } },
        payment: { select: { id: true, status: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true, issuedAt: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / limit) });
}

// PUT /api/admin/orders - Update order status
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const updateData: any = {};
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'completed') updateData.dateCompleted = new Date();
    }
    if (data.customerNote !== undefined) updateData.customerNote = data.customerNote;

    const order = await prisma.order.update({
      where: { id: data.id },
      data: updateData,
      include: {
        items: { select: { id: true, name: true, quantity: true, price: true, total: true } },
        payment: { select: { id: true, status: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true, issuedAt: true, createdAt: true } },
      },
    });

    // Update payment status if order status changed
    if (data.status && order.payment) {
      const paymentStatus = data.status === 'completed' || data.status === 'processing' ? 'paid' :
                            data.status === 'refunded' ? 'refunded' :
                            data.status === 'cancelled' ? 'cancelled' : order.payment.status;
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: paymentStatus },
      });
    }

    // Add status change note
    if (data.status) {
      await prisma.orderNote.create({
        data: {
          orderId: data.id,
          note: `Status geändert → ${data.status}`,
          author: 'Admin',
        },
      });
    }

    // Trigger completion email when status → completed
    let emailResult = null;
    if (data.status === 'completed') {
      try {
        emailResult = await sendCompletionEmail(data.id);
      } catch (err) {
        console.error('Completion email failed:', err);
        emailResult = { success: false, error: 'Email send failed' };
      }
    }

    return NextResponse.json({ ...order, emailResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
