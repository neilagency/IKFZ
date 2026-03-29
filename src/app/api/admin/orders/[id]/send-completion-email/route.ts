import { NextRequest, NextResponse } from 'next/server';
import { sendCompletionEmail } from '@/lib/completion-email';

export const dynamic = 'force-dynamic';

type RouteCtx = { params: Promise<{ id: string }> };

/** POST /api/admin/orders/[id]/send-completion-email – send completion email */
export async function POST(_request: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params;

  try {
    const result = await sendCompletionEmail(id);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Send completion email error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
