import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { CAMPAIGN_TEMPLATES } from '@/lib/campaign-templates';
import { getAdminSession, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function jsonResponse(data: unknown, status = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
    },
  });
}

/** GET /api/admin/email-campaigns – list campaigns */
export async function GET(request: NextRequest) {
  if (!getAdminSession()) return unauthorized();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status') || undefined;
  const search = searchParams.get('search') || undefined;

  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { subject: { contains: search } },
    ];
  }

  try {
    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    return jsonResponse({
      campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Campaigns API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST /api/admin/email-campaigns – create campaign */
export async function POST(request: NextRequest) {
  if (!getAdminSession()) return unauthorized();
  try {
    const body = await request.json();
    const { name, templateId } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    let templateData: Record<string, string> = {};
    if (templateId) {
      const template = CAMPAIGN_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        templateData = {
          subject: template.subject,
          heading: template.heading,
          content: template.content,
          ctaText: template.ctaText,
          ctaUrl: template.ctaUrl,
        };
      }
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        name: name.trim(),
        subject: (body.subject || templateData.subject || '').trim(),
        heading: (body.heading || templateData.heading || '').trim(),
        content: (body.content || templateData.content || '').trim(),
        imageUrl: (body.imageUrl || '').trim(),
        ctaText: (body.ctaText || templateData.ctaText || '').trim(),
        ctaUrl: (body.ctaUrl || templateData.ctaUrl || '').trim(),
        templateId: templateId || '',
        status: 'draft',
      },
    });

    return jsonResponse(campaign, 201);
  } catch (error) {
    console.error('Create campaign error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
