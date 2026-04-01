import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Polling fallback — returns all active product prices as JSON.
// Used by usePriceFeed when SSE is unavailable or reconnecting.
export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true, status: 'publish' },
    select: { slug: true, price: true, options: true },
  });

  const prices = products.reduce(
    (acc, p) => {
      acc[p.slug] = { price: p.price, options: p.options ?? null };
      return acc;
    },
    {} as Record<string, { price: number; options: string | null }>,
  );

  return NextResponse.json(prices, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
