import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getCustomerSession } from '@/lib/customer-auth';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { customerId: session.id },
          { billingEmail: session.email.toLowerCase() },
        ],
      },
      include: {
        items: true,
        payment: true,
        invoice: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Bestellung nicht gefunden.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Customer order detail error:', error);
    return NextResponse.json(
      { error: 'Bestellung konnte nicht geladen werden.' },
      { status: 500 }
    );
  }
}
