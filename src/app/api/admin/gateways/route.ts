/**
 * Admin Payment Gateways API
 * ==========================
 * GET  /api/admin/gateways/ — List all gateways + payment stats per gateway
 * PUT  /api/admin/gateways/ — Update gateway (enable/disable, fee, mode, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { revalidatePath, revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const [gateways, paymentStats, totalRevenue, totalTransactions] = await Promise.all([
    prisma.paymentGateway.findMany({
      orderBy: { sortOrder: 'asc' },
    }),
    prisma.payment.groupBy({
      by: ['gateway'],
      where: { status: 'paid' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.count(),
  ]);

  const activeCount = gateways.filter((g) => g.isEnabled).length;
  const inactiveCount = gateways.length - activeCount;

  return NextResponse.json({
    gateways,
    paymentStats,
    summary: {
      totalRevenue: totalRevenue._sum.amount ?? 0,
      totalPaidTransactions: totalRevenue._count ?? 0,
      totalTransactions,
      activeGateways: activeCount,
      inactiveGateways: inactiveCount,
    },
  });
}

export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Gateway ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;
    if (body.fee !== undefined) updateData.fee = Number(body.fee);
    if (body.mode !== undefined) updateData.mode = body.mode;
    if (body.sortOrder !== undefined) updateData.sortOrder = Number(body.sortOrder);
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;

    const gateway = await prisma.paymentGateway.update({
      where: { id: body.id },
      data: updateData,
    });

    // Invalidate cache so checkout page immediately reflects changes
    revalidatePath('/rechnung');
    revalidatePath('/');
    revalidateTag('payment-gateways');

    return NextResponse.json(gateway);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
