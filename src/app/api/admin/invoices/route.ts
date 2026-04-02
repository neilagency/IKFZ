import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyAuth, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/invoices - List all invoices
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  const status = req.nextUrl.searchParams.get('status') || '';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');

  const where: any = {};
  if (status) where.status = status;

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            billingFirstName: true,
            billingLastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total, page, totalPages: Math.ceil(total / limit) });
}

// GET /api/admin/invoices/[id] - Single invoice detail (for PDF)
// PUT /api/admin/invoices - Update invoice
export async function PUT(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) return unauthorized();

  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const invoice = await prisma.invoice.update({
      where: { id: data.id },
      data: {
        status: data.status,
        notes: data.notes,
        paidAt: data.status === 'paid' ? new Date() : undefined,
      },
    });
    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
