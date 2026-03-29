import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function jsonResponse(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
    },
  });
}

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** GET /api/admin/coupons – list coupons */
export async function GET(request: NextRequest) {
  if (!getAdminSession()) return unauthorized();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const where: any = {};
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }
  if (status === 'active') {
    where.isActive = true;
  } else if (status === 'inactive') {
    where.isActive = false;
  } else if (status === 'expired') {
    where.endDate = { lt: new Date() };
  }

  try {
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { usages: true } } },
      }),
      prisma.coupon.count({ where }),
    ]);

    return jsonResponse({
      coupons,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Coupons API error:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}

/** POST /api/admin/coupons – create coupon */
export async function POST(request: NextRequest) {
  if (!getAdminSession()) return unauthorized();
  try {
    const body = await request.json();

    let code = (body.code || '').trim().toUpperCase();
    if (!code) {
      for (let i = 0; i < 10; i++) {
        code = generateCode();
        const existing = await prisma.coupon.findUnique({ where: { code } });
        if (!existing) break;
      }
    }

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: 'Dieser Code existiert bereits' }, { status: 400 });
    }

    if (!body.discountValue || body.discountValue <= 0) {
      return NextResponse.json({ error: 'Rabattwert muss größer als 0 sein' }, { status: 400 });
    }

    if (body.discountType === 'percentage' && body.discountValue > 100) {
      return NextResponse.json({ error: 'Prozentsatz darf nicht über 100% sein' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: (body.description || '').trim(),
        discountType: body.discountType === 'percentage' ? 'percentage' : 'fixed',
        discountValue: parseFloat(body.discountValue) || 0,
        minOrderValue: parseFloat(body.minOrderValue) || 0,
        maxUsageTotal: parseInt(body.maxUsageTotal) || 0,
        maxUsagePerUser: parseInt(body.maxUsagePerUser) || 1,
        productSlugs: (body.productSlugs || '').trim(),
        isActive: body.isActive !== false,
        showBanner: body.showBanner === true,
        bannerText: (body.bannerText || '').trim(),
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return jsonResponse(coupon, 201);
  } catch (error) {
    console.error('Create coupon error:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
