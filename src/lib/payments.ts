/**
 * Mollie Payment Library
 * ======================
 * Provides payment creation, status checking, and refund operations via Mollie API.
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

/* ── Checkout → Mollie method mapping ─────────────────────── */
const CHECKOUT_TO_MOLLIE: Record<string, PaymentMethod> = {
  creditcard: PaymentMethod.creditcard,
  applepay: PaymentMethod.applepay,
  klarna: PaymentMethod.klarna,
  sepa: PaymentMethod.banktransfer,
};

export function isMollieMethod(checkoutMethod: string): boolean {
  return checkoutMethod in CHECKOUT_TO_MOLLIE;
}

export function getCheckoutMollieMethod(checkoutMethod: string): PaymentMethod | undefined {
  return CHECKOUT_TO_MOLLIE[checkoutMethod];
}

/* ── Create Mollie Payment ────────────────────────────────── */
export interface CreateMolliePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  description: string;
  method: PaymentMethod;
  redirectUrl: string;
  webhookUrl: string;
}

export interface MolliePaymentResult {
  paymentId: string;
  checkoutUrl: string | null;
  status: string;
}

export async function createMolliePayment(
  params: CreateMolliePaymentParams,
): Promise<MolliePaymentResult> {
  const mollie = getMollieClient();

  const payment = await mollie.payments.create({
    amount: {
      currency: 'EUR',
      value: params.amount.toFixed(2),
    },
    description: params.description,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    method: params.method,
    metadata: {
      orderId: params.orderId,
      orderNumber: params.orderNumber,
    },
  });

  return {
    paymentId: payment.id,
    checkoutUrl: payment.getCheckoutUrl() ?? null,
    status: payment.status,
  };
}

/* ── Get Mollie Payment Status ────────────────────────────── */
export async function getMolliePayment(paymentId: string) {
  const mollie = getMollieClient();
  const payment = await mollie.payments.get(paymentId);
  return {
    id: payment.id,
    status: payment.status,
    amount: {
      currency: String(payment.amount.currency),
      value: String(payment.amount.value),
    },
    metadata: payment.metadata as Record<string, string> | null,
    paidAt: payment.paidAt ?? null,
    method: payment.method ?? null,
  };
}
