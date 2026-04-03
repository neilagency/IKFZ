import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  // Batch-fetch totalSpent for listed customers (single query, no N+1)
  const customerIds = customers.map((c: any) => c.id);
  const spentByCustomer = customerIds.length > 0
    ? await prisma.order.groupBy({
        by: ['customerId'],
        where: {
          customerId: { in: customerIds },
          status: { notIn: ['cancelled', 'refunded'] },
        },
        _sum: { total: true },
      })
    : [];
  const spentMap = new Map(spentByCustomer.map((s: any) => [s.customerId, s._sum.total || 0]));

  const enriched = customers.map((c: any) => ({
    ...c,
    totalSpent: spentMap.get(c.id) || 0,
    orderCount: c._count.orders,
  }));

  return NextResponse.json({ customers: enriched, total, page, totalPages: Math.ceil(total / limit) });
}
