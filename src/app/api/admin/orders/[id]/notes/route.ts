/**
 * Order Notes API
 * ================
 * POST /api/admin/orders/[id]/notes – Add a note to an order
 * GET  /api/admin/orders/[id]/notes – List notes for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** GET – list notes for order */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const notes = await prisma.orderNote.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST – add note */
export async function POST(request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const { note } = body;

    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json({ error: 'Notiz ist erforderlich' }, { status: 400 });
    }

    const orderNote = await prisma.orderNote.create({
      data: {
        orderId: id,
        note: note.trim(),
        author: 'Admin',
      },
    });

    return NextResponse.json({ note: orderNote }, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
