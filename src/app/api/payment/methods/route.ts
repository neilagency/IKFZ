/**
 * Public Payment Methods API
 * ==========================
 * GET /api/payment/methods/
 *
 * Returns currently enabled payment methods for the checkout page.
 * No authentication required — this is public data.
 */

import { NextResponse } from 'next/server';
import { getEnabledPaymentMethods } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const methods = await getEnabledPaymentMethods();
    return NextResponse.json({ methods });
  } catch (error) {
    console.error('[payment-methods] Error:', error);
    // Fallback hardcoded methods in case DB is unavailable
    return NextResponse.json({
      methods: [
        { id: 'paypal', label: 'PayPal', description: '', fee: 0, icon: '' },
        { id: 'creditcard', label: 'Kreditkarte', description: '', fee: 0.50, icon: '' },
        { id: 'sepa', label: 'SEPA-Überweisung', description: '', fee: 0, icon: '' },
      ],
    });
  }
}
