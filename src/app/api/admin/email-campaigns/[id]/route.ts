import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** GET /api/admin/email-campaigns/[id] – single campaign */
export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) {
      return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** PUT /api/admin/email-campaigns/[id] – update campaign */
export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 });
    }

    if (existing.status !== 'draft' && existing.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Nur Entwürfe und geplante Kampagnen können bearbeitet werden' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const ALLOWED_FIELDS = [
      'name', 'subject', 'heading', 'content', 'imageUrl',
      'ctaText', 'ctaUrl', 'targetMode', 'targetEmails',
      'targetSegment', 'templateId', 'scheduledAt',
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        if (field === 'scheduledAt') {
          data[field] = body[field] ? new Date(body[field]) : null;
        } else {
          data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
        }
      }
    }

    // Auto-manage status based on scheduledAt
    if ('scheduledAt' in data) {
      if (data.scheduledAt && existing.status === 'draft') {
        data.status = 'scheduled';
      } else if (!data.scheduledAt && existing.status === 'scheduled') {
        data.status = 'draft';
      }
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data,
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/email-campaigns/[id] – delete campaign */
export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const existing = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 });
    }

    if (existing.status === 'sending') {
      return NextResponse.json(
        { error: 'Laufende Kampagnen können nicht gelöscht werden' },
        { status: 400 }
      );
    }

    await prisma.emailCampaign.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
