import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

/** GET /api/active-promo/ – get active coupon with banner enabled */
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
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
        ],
      },
      select: {
        code: true,
        discountType: true,
        discountValue: true,
        bannerText: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ promo: promo || null }, { headers: NO_CACHE });
  } catch (error) {
    console.error('Active promo error:', error);
    return NextResponse.json({ promo: null }, { headers: NO_CACHE });
  }
}
