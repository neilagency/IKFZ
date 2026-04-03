import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/dashboard - Dashboard statistics (live from DB, no cache)
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const [
      totalOrders,
      completedOrders,
      processingOrders,
      cancelledOrders,
      refundedOrders,
      totalCustomers,
      totalProducts,
      totalInvoices,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: 'completed' } }),
      prisma.order.count({ where: { status: 'processing' } }),
      prisma.order.count({ where: { status: 'cancelled' } }),
      prisma.order.count({ where: { status: 'refunded' } }),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.invoice.count(),
    ]);

    // Revenue — single query to get all revenue orders, then derive totals + monthly
    const revenueOrders = await prisma.order.findMany({
      where: { status: { in: ['completed', 'processing'] } },
      select: { total: true, createdAt: true, paymentMethodTitle: true },
    });

    const totalRevenue = revenueOrders.reduce((sum, o) => sum + o.total, 0);

    // Monthly revenue — aggregate in memory from single query (replaces 12 DB calls)
    const currentDate = new Date();
    const monthlyMap = new Map<string, { revenue: number; orders: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      monthlyMap.set(key, { revenue: 0, orders: 0 });
    }
    for (const o of revenueOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.revenue += o.total;
        entry.orders++;
      }
    }
    const monthlyRevenue = Array.from(monthlyMap.entries()).map(([key, data]) => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m, 1);
      return {
        month: d.toLocaleDateString('de-DE', { year: 'numeric', month: 'short' }),
        revenue: data.revenue,
        orders: data.orders,
      };
    });

    // Payment method breakdown — from same query (no extra DB call)
    const methodMap = new Map<string, { count: number; total: number }>();
    for (const o of revenueOrders) {
      const key = o.paymentMethodTitle || 'Unknown';
      const existing = methodMap.get(key) || { count: 0, total: 0 };
      methodMap.set(key, { count: existing.count + 1, total: existing.total + o.total });
    }
    const paymentMethods = Array.from(methodMap.entries())
      .map(([method, data]) => ({ method, count: data.count, total: data.total }))
      .sort((a, b) => b.count - a.count);

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        currency: true,
        billingFirstName: true,
        billingLastName: true,
        billingEmail: true,
        paymentMethodTitle: true,
        createdAt: true,
      },
    });

    // Order status breakdown
    const statusBreakdown = [
      { status: 'completed', count: completedOrders, color: '#22c55e' },
      { status: 'processing', count: processingOrders, color: '#3b82f6' },
      { status: 'cancelled', count: cancelledOrders, color: '#ef4444' },
      { status: 'refunded', count: refundedOrders, color: '#f59e0b' },
      { status: 'other', count: totalOrders - completedOrders - processingOrders - cancelledOrders - refundedOrders, color: '#6b7280' },
    ].filter(s => s.count > 0);

    const responseData = {
      stats: {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
        totalInvoices,
        completedOrders,
        processingOrders,
      },
      recentOrders,
      paymentMethods,
      monthlyRevenue,
      statusBreakdown,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[Dashboard API Error]', error);
    return NextResponse.json(
      { error: 'Dashboard-Daten konnten nicht geladen werden', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
