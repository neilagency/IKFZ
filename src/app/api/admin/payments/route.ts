import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

// GET /api/admin/payments - List all payments
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const status = req.nextUrl.searchParams.get('status') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  const where: any = {};
  if (status) where.status = status;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            billingFirstName: true,
            billingLastName: true,
            billingEmail: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return NextResponse.json({ payments, total, page, totalPages: Math.ceil(total / limit) });
}

// PUT /api/admin/payments - Update payment status
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const payment = await prisma.payment.update({
      where: { id: data.id },
      data: {
        status: data.status,
        transactionId: data.transactionId,
        paidAt: data.status === 'completed' ? new Date() : undefined,
      },
    });
    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
