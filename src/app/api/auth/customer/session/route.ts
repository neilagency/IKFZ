import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSession, clearCustomerCookie } from '@/lib/customer-auth';

export async function GET() {
  try {
    const session = getCustomerSession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      customer: session,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  return clearCustomerCookie(response);
}
