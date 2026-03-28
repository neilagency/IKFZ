import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

// GET /api/admin/customers - List all customers
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const search = req.nextUrl.searchParams.get('search') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
        orders: {
          select: { total: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  // Add total spent
  const enriched = customers.map((c: any) => ({
    ...c,
    totalSpent: c.orders.reduce((sum: number, o: any) => sum + (o.status !== 'cancelled' && o.status !== 'refunded' ? o.total : 0), 0),
    orderCount: c._count.orders,
  }));

  return NextResponse.json({ customers: enriched, total, page, totalPages: Math.ceil(total / limit) });
}
