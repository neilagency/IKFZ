import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/db';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { createCustomerToken, setCustomerCookie } from '@/lib/customer-auth';
import { linkGuestOrders } from '@/lib/link-guest-orders';

const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(`login:${ip}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic error to prevent email enumeration
    const genericError = 'E-Mail oder Passwort ist falsch.';

    if (!customer || !customer.password) {
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      return NextResponse.json({ error: genericError }, { status: 401 });
    }

    // Update last login
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    // Link any guest orders
    await linkGuestOrders(normalizedEmail, customer.id);

    const token = createCustomerToken({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    });

    return setCustomerCookie(response, token);
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    );
  }
}
