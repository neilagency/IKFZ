import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'customer_token';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function getSecret(): string {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'change-me-in-production';
}

export interface CustomerSession {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function createCustomerToken(payload: CustomerSession): string {
  return jwt.sign({ ...payload }, getSecret(), { expiresIn: MAX_AGE });
}

export function verifyCustomerToken(token: string): CustomerSession | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as CustomerSession & jwt.JwtPayload;
    return {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };
  } catch {
    return null;
  }
}

export function setCustomerCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return response;
}

export function clearCustomerCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

/** Get customer session from cookies() — for Server Components / Route Handlers */
export function getCustomerSession(): CustomerSession | null {
  const cookieStore = cookies();
  const token = (cookieStore as any).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}

/** Get customer session from NextRequest — for Middleware */
export function getCustomerSessionFromRequest(request: NextRequest): CustomerSession | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyCustomerToken(token);
}
