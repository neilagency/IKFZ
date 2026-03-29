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
    // Verify order belongs to customer
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { customerId: session.id },
          { billingEmail: session.email.toLowerCase() },
        ],
      },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Bestellung nicht gefunden.' },
        { status: 404 }
      );
    }

    const documents = await prisma.orderDocument.findMany({
      where: { orderId: id },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        token: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Customer order documents error:', error);
    return NextResponse.json(
      { error: 'Dokumente konnten nicht geladen werden.' },
      { status: 500 }
    );
  }
}
