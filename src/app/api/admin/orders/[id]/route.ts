/**
 * Single Order API
 * ================
 * GET    /api/admin/orders/[id] – Get single order with all relations
 * PATCH  /api/admin/orders/[id] – Update order fields (status, notes, etc.)
 * DELETE /api/admin/orders/[id] – Soft-delete order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAdminSession, unauthorized } from '@/lib/auth';
import { sendCompletionEmail } from '@/lib/completion-email';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** GET – single order with all relations */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        payment: true,
        invoice: true,
        customer: true,
        notes: { orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** PATCH – update order fields + trigger completion email */
export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Status change
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.dateCompleted = new Date();
      }
      if (body.status === 'completed' || body.status === 'processing') {
        updateData.datePaid = new Date();
      }
    }

    // Other updatable fields
    if (body.customerNote !== undefined) updateData.customerNote = body.customerNote;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: true, payment: true, invoice: true, customer: true },
    });

    // Sync payment status
    if (body.status && order.payment) {
      const paymentStatus =
        body.status === 'completed' || body.status === 'processing' ? 'paid' :
        body.status === 'refunded' ? 'refunded' :
        body.status === 'cancelled' ? 'cancelled' : order.payment.status;
      await prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: paymentStatus, ...(paymentStatus === 'paid' && !order.payment.paidAt ? { paidAt: new Date() } : {}) },
      });
    }

    // Sync invoice status
    if (body.status && order.invoice) {
      const invoiceStatus =
        body.status === 'completed' || body.status === 'processing' ? 'paid' :
        body.status === 'refunded' ? 'refunded' :
        body.status === 'cancelled' ? 'cancelled' : order.invoice.status;
      await prisma.invoice.update({
        where: { id: order.invoice.id },
        data: { status: invoiceStatus },
      });
    }

    // Add status change note
    if (body.status) {
      await prisma.orderNote.create({
        data: {
          orderId: id,
          note: `Status geändert → ${body.status}`,
          author: 'Admin',
        },
      });
    }

    // Trigger completion email when status → completed
    let emailResult = null;
    if (body.status === 'completed') {
      try {
        emailResult = await sendCompletionEmail(id);
      } catch (err) {
        console.error('Completion email failed:', err);
        emailResult = { success: false, error: 'Email send failed' };
      }
    }

    return NextResponse.json({ order, emailResult });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE – soft-delete order */
export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  if (!getAdminSession()) return unauthorized();
  const { id } = await ctx.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { status: true, deletedAt: true },
    });

    if (!order || order.deletedAt) {
      return NextResponse.json({ error: 'Bestellung nicht gefunden oder bereits gelöscht' }, { status: 404 });
    }

    await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });

    await prisma.orderNote.create({
      data: {
        orderId: id,
        note: `Order gelöscht (soft delete). Vorheriger Status: ${order.status}`,
        author: 'System',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
