import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCustomerSession } from '@/lib/customer-auth';

export async function GET() {
  const session = getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  try {
    const where = {
      OR: [
        { customerId: session.id },
        { billingEmail: session.email.toLowerCase() },
      ],
    };

    const [total, completed, pending, processing, recentOrders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, status: 'completed' } }),
      prisma.order.count({ where: { ...where, status: 'pending' } }),
      prisma.order.count({ where: { ...where, status: 'processing' } }),
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          currency: true,
          productName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    return NextResponse.json({
      stats: { total, completed, pending, processing },
      recentOrders,
    });
  } catch (error) {
    console.error('Customer stats error:', error);
    return NextResponse.json(
      { error: 'Statistiken konnten nicht geladen werden.' },
      { status: 500 }
    );
  }
}
