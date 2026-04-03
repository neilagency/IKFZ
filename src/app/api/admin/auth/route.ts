import { NextRequest, NextResponse } from 'next/server';
import { signToken, setAuthCookie, clearAuthCookie, verifyAuth } from '@/lib/auth';

// Simple in-memory rate limiter (per IP, 5 attempts per minute)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  loginAttempts.forEach((val, key) => {
    if (now > val.resetAt) loginAttempts.delete(key);
  });
}, 5 * 60 * 1000);

// POST /api/admin/auth - Login
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Zu viele Anmeldeversuche. Bitte warten Sie eine Minute.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort erforderlich' }, { status: 400 });
    }

    const prisma = (await import('@/lib/db')).default;
    const bcrypt = (await import('bcryptjs')).default;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 });
    }
    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

    return setAuthCookie(response, token);
  } catch (error) {
    console.error('Auth error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Server-Fehler', debug: msg }, { status: 500 });
  }
}

// GET /api/admin/auth - Check session / get current user
export async function GET(req: NextRequest) {
  const user = verifyAuth(req);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}

// DELETE /api/admin/auth - Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  return clearAuthCookie(response);
}
