import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '@/lib/db';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { createCustomerToken, setCustomerCookie } from '@/lib/customer-auth';
import { linkGuestOrders } from '@/lib/link-guest-orders';

const registerSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const limit = rateLimit(`register:${ip}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 });
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Zu viele Registrierungsversuche. Bitte versuchen Sie es später erneut.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 12);

    // Check if customer exists
    const existing = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    let customer;

    if (existing) {
      if (existing.password) {
        // Already registered
        return NextResponse.json(
          { error: 'Ein Konto mit dieser E-Mail-Adresse existiert bereits.' },
          { status: 409 }
        );
      }

      // Guest customer → upgrade to registered
      customer = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          password: hashedPassword,
          firstName,
          lastName,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName,
          lastName,
          lastLoginAt: new Date(),
        },
      });
    }

    // Link guest orders
    await linkGuestOrders(normalizedEmail, customer.id);

    const token = createCustomerToken({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
    });

    const response = NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
      },
      { status: 201 }
    );

    return setCustomerCookie(response, token);
  } catch (error) {
    console.error('Customer register error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' },
      { status: 500 }
    );
  }
}
