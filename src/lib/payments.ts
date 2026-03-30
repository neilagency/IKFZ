/**
 * Mollie Payment Library
 * ======================
 * Provides refund operations via Mollie API.
 */

import createMollieClient, { PaymentMethod } from '@mollie/api-client';

/* ── Env ──────────────────────────────────────────────────── */
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY || '';

/* ── Mollie method mapping ────────────────────────────────── */
const MOLLIE_METHOD_MAP: Record<string, PaymentMethod> = {
  paypal: PaymentMethod.paypal,
  credit_card: PaymentMethod.creditcard,
  apple_pay: PaymentMethod.applepay,
  sepa: PaymentMethod.banktransfer,
  klarna: PaymentMethod.klarna,
};

export function getMollieMethod(checkoutId: string): PaymentMethod | undefined {
  return MOLLIE_METHOD_MAP[checkoutId];
}

/* ── Types ────────────────────────────────────────────────── */
export interface RefundResult {
  refundId: string;
  status: string;
  amount: { currency: string; value: string };
}

/* ── Client ───────────────────────────────────────────────── */
let _mollieClient: ReturnType<typeof createMollieClient> | null = null;

function getMollieClient() {
  if (!MOLLIE_API_KEY) {
    throw new Error('MOLLIE_API_KEY is not set');
  }
  if (!_mollieClient) {
    _mollieClient = createMollieClient({ apiKey: MOLLIE_API_KEY });
  }
  return _mollieClient;
}

/* ── Create Mollie Refund ─────────────────────────────────── */
export async function createMollieRefund(
  paymentId: string,
  amount: { currency: string; value: string },
  description?: string,
): Promise<RefundResult> {
  const mollie = getMollieClient();

  const refund = await mollie.paymentRefunds.create({
    paymentId,
    amount,
    ...(description ? { description } : {}),
  });

  return {
    refundId: refund.id,
    status: refund.status,
    amount: { currency: String(refund.amount.currency), value: String(refund.amount.value) },
  };
}

/* ── Get Mollie Refunds for Payment ───────────────────────── */
export async function getMollieRefunds(paymentId: string) {
  const mollie = getMollieClient();
  const refunds = await mollie.paymentRefunds.page({ paymentId });
  return Array.from(refunds).map((r: any) => ({
    id: r.id,
    status: r.status,
    amount: { currency: String(r.amount.currency), value: String(r.amount.value) },
    createdAt: r.createdAt,
    description: r.description,
  }));
}
