import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** POST /api/admin/email-campaigns/[id]/duplicate – duplicate a campaign */
export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const original = await prisma.emailCampaign.findUnique({ where: { id } });
    if (!original) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const copy = await prisma.emailCampaign.create({
      data: {
        name: `${original.name} (Kopie)`,
        subject: original.subject,
        heading: original.heading,
        content: original.content,
        imageUrl: original.imageUrl,
        ctaText: original.ctaText,
        ctaUrl: original.ctaUrl,
        targetMode: original.targetMode,
        targetEmails: original.targetEmails,
        targetSegment: original.targetSegment,
        templateId: original.templateId,
        status: 'draft',
      },
    });

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    console.error('Duplicate campaign error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
