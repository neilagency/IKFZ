import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCustomerSession } from '@/lib/customer-auth';

export async function GET(request: NextRequest) {
  const session = getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const skip = (page - 1) * limit;

  try {
    const where = {
      deletedAt: null,
      OR: [
        { customerId: session.id },
        { billingEmail: session.email.toLowerCase() },
      ],
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          productName: true,
          paymentMethodTitle: true,
          createdAt: true,
          datePaid: true,
          dateCompleted: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Customer orders list error:', error);
    return NextResponse.json(
      { error: 'Bestellungen konnten nicht geladen werden.' },
      { status: 500 }
    );
  }
}
