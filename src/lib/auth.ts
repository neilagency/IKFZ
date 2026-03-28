import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Set it in .env');
  }
  return secret;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

const TOKEN_COOKIE = 'admin_token';
const TOKEN_MAX_AGE = 60 * 60 * 24; // 1 day in seconds

export function verifyAuth(req: NextRequest): AuthUser | null {
  // Try httpOnly cookie first, then fallback to Authorization header for backward compat
  let token: string | undefined;

  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value;
  if (cookieToken) {
    token = cookieToken;
  } else {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) return null;

  try {
    return jwt.verify(token, getJwtSecret()) as AuthUser;
  } catch {
    return null;
  }
}

export function signToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '1d' });
}

export function setAuthCookie(res: NextResponse, token: string): NextResponse {
  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
  return res;
}

export function clearAuthCookie(res: NextResponse): NextResponse {
  res.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return res;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
}

// Role-based access helpers
export function requireRole(user: AuthUser, ...roles: string[]): boolean {
  return roles.includes(user.role);
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
}
