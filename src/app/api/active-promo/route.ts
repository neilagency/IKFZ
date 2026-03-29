import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/active-promo – get active coupon with banner enabled */
export async function GET() {
  try {
    const now = new Date();

    const promo = await prisma.coupon.findFirst({
      where: {
        isActive: true,
        showBanner: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
      },
      select: {
        code: true,
        discountType: true,
        discountValue: true,
        bannerText: true,
        productSlugs: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (promo && promo.endDate && now > promo.endDate) {
      return NextResponse.json({ promo: null }, {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
      });
    }

    return NextResponse.json({ promo: promo || null }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Active promo error:', error);
    return NextResponse.json({ promo: null });
  }
}
