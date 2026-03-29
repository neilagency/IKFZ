import { NextRequest, NextResponse } from 'next/server';
import { countRecipients } from '@/lib/campaign-recipients';

export const dynamic = 'force-dynamic';

/** POST /api/admin/email-campaigns/count-recipients – count recipients for targeting */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetMode = 'all', targetEmails = '', targetSegment = '' } = body;

    const count = await countRecipients({ targetMode, targetEmails, targetSegment });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Count recipients error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
