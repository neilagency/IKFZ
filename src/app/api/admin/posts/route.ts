import { NextRequest, NextResponse } from 'next/server';

// Deprecated — use /api/admin/blog instead
export async function GET() {
  return NextResponse.json({ error: 'Deprecated. Use /api/admin/blog' }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: 'Deprecated. Use /api/admin/blog' }, { status: 410 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Deprecated. Use /api/admin/blog' }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: 'Deprecated. Use /api/admin/blog' }, { status: 410 });
}
