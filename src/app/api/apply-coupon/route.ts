import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60_000 };

/** POST /api/apply-coupon – validate coupon + calculate discount */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const rl = rateLimit(ip + ':coupon', RATE_LIMIT_CONFIG);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte warten Sie eine Minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.reset / 1000)) } },
    );
  }

  try {
    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const email = (body.email || '').trim().toLowerCase();
    const productSlug = (body.productSlug || '').trim();
    const subtotal = parseFloat(body.subtotal) || 0;

    if (!code) {
      return NextResponse.json({ error: 'Bitte geben Sie einen Gutscheincode ein.' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon) {
      return NextResponse.json({ error: 'Ungültiger Gutscheincode.' }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: 'Dieser Gutschein ist nicht mehr aktiv.' }, { status: 400 });
    }

    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) {
      return NextResponse.json({ error: 'Dieser Gutschein ist noch nicht gültig.' }, { status: 400 });
    }
    if (coupon.endDate && now > coupon.endDate) {
      return NextResponse.json({ error: 'Dieser Gutschein ist abgelaufen.' }, { status: 400 });
    }

    if (coupon.maxUsageTotal > 0 && coupon.usageCount >= coupon.maxUsageTotal) {
      return NextResponse.json({ error: 'Dieser Gutschein wurde bereits zu oft verwendet.' }, { status: 400 });
    }

    if (coupon.maxUsagePerUser > 0 && email) {
      const userUsages = await prisma.couponUsage.count({
        where: { couponId: coupon.id, email },
      });
      if (userUsages >= coupon.maxUsagePerUser) {
        return NextResponse.json({ error: 'Sie haben diesen Gutschein bereits verwendet.' }, { status: 400 });
      }
    }

    if (coupon.productSlugs && productSlug) {
      const allowedSlugs = coupon.productSlugs.split(',').map((s) => s.trim().toLowerCase());
      if (!allowedSlugs.includes(productSlug.toLowerCase())) {
        return NextResponse.json(
          { error: 'Dieser Gutschein gilt nicht für dieses Produkt.' },
          { status: 400 },
        );
      }
    }

    if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
      return NextResponse.json(
        { error: `Mindestbestellwert: ${coupon.minOrderValue.toFixed(2).replace('.', ',')} €` },
        { status: 400 },
      );
    }

    let discountAmount: number;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * coupon.discountValue) / 100 * 100) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      description: coupon.description,
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
