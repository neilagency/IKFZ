import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/admin/invoices/[id] - Single invoice detail
export async function GET(req: NextRequest, ctx: RouteCtx) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const { id } = await ctx.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          serviceData: true,
          productName: true,
          paymentMethod: true,
          paymentMethodTitle: true,
          transactionId: true,
          datePaid: true,
          billingFirstName: true,
          billingLastName: true,
          billingEmail: true,
          billingPhone: true,
          billingAddress1: true,
          billingCity: true,
          billingPostcode: true,
          billingCountry: true,
          payment: { select: { status: true, transactionId: true, paidAt: true } },
          items: { select: { name: true, quantity: true, price: true, total: true } },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

// DELETE /api/admin/invoices/[id] - Delete an invoice
export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const { id } = await ctx.params;

  try {
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 });
  }
}
