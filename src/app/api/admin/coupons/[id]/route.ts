import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/admin/coupons/[id] – single coupon with usages */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: { select: { usages: true } },
      },
    });
    if (!coupon) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Get coupon error:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

/** PUT /api/admin/coupons/[id] – update coupon */
export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const body = await request.json();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    if (body.code && body.code.toUpperCase() !== existing.code) {
      const dup = await prisma.coupon.findUnique({
        where: { code: body.code.toUpperCase() },
      });
      if (dup) {
        return NextResponse.json({ error: 'Dieser Code existiert bereits' }, { status: 400 });
      }
    }

    if (body.discountType === 'percentage' && body.discountValue > 100) {
      return NextResponse.json({ error: 'Prozentsatz darf nicht über 100% sein' }, { status: 400 });
    }

    const data: any = {};
    if ('code' in body) data.code = body.code.trim().toUpperCase();
    if ('description' in body) data.description = (body.description || '').trim();
    if ('discountType' in body) data.discountType = body.discountType;
    if ('discountValue' in body) data.discountValue = parseFloat(body.discountValue) || 0;
    if ('minOrderValue' in body) data.minOrderValue = parseFloat(body.minOrderValue) || 0;
    if ('maxUsageTotal' in body) data.maxUsageTotal = parseInt(body.maxUsageTotal) || 0;
    if ('maxUsagePerUser' in body) data.maxUsagePerUser = parseInt(body.maxUsagePerUser) || 1;
    if ('productSlugs' in body) data.productSlugs = (body.productSlugs || '').trim();
    if ('isActive' in body) data.isActive = !!body.isActive;
    if ('showBanner' in body) data.showBanner = !!body.showBanner;
    if ('bannerText' in body) data.bannerText = (body.bannerText || '').trim();
    if ('startDate' in body) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if ('endDate' in body) data.endDate = body.endDate ? new Date(body.endDate) : null;

    const coupon = await prisma.coupon.update({ where: { id }, data });
    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Update coupon error:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons/[id] – delete coupon */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
