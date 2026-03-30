/**
 * PayPal Direct Integration (REST API v2)
 * ========================================
 * Handles PayPal refunds via the REST API directly.
 *
 * Requires env vars:
 *   PAYPAL_CLIENT_ID     – Live/Sandbox client ID
 *   PAYPAL_CLIENT_SECRET – Live/Sandbox secret
 *   PAYPAL_MODE          – "live" | "sandbox" (default: "live")
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';

const PAYPAL_BASE_URL =
  PAYPAL_MODE === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

/* ── Access Token (cached) ─────────────────────────────────── */
let _accessToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (_accessToken && Date.now() < _tokenExpiry) {
    return _accessToken;
  }

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET)');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`PayPal auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  _accessToken = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return _accessToken!;
}

/* ── Refund Types ──────────────────────────────────────────── */
export interface PayPalRefundResult {
  refundId: string;
  status: string;
  amount: string;
}

export interface PayPalRefundRecord {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
  create_time: string;
}

/* ── Refund a PayPal Capture ───────────────────────────────── */
export async function refundPayPalCapture(
  captureId: string,
  amount?: { currency_code: string; value: string },
  note?: string,
): Promise<PayPalRefundResult> {
  const token = await getAccessToken();

  const body: Record<string, unknown> = {};
  if (amount) {
    body.amount = amount;
  }
  if (note) {
    body.note_to_payer = note.slice(0, 255);
  }

  const res = await fetch(
    `${PAYPAL_BASE_URL}/v2/payments/captures/${captureId}/refund`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(errText); } catch { /* ignore */ }
    const detail = parsed?.details?.[0]?.description || parsed?.message || errText;
    console.error('[paypal] Refund failed:', res.status, errText);
    throw new Error(detail || `PayPal refund failed (${res.status})`);
  }

  const data = await res.json();

  return {
    refundId: data.id || '',
    status: data.status || '',
    amount: data.amount?.value || '',
  };
}

/* ── Get Refunds for a PayPal Capture ──────────────────────── */
export async function getPayPalCaptureRefunds(
  captureId: string,
): Promise<PayPalRefundRecord[]> {
  const token = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_BASE_URL}/v2/payments/captures/${captureId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const refunds: PayPalRefundRecord[] = [];

  if (data.amount && (data.status === 'REFUNDED' || data.status === 'PARTIALLY_REFUNDED')) {
    refunds.push({
      id: data.id,
      status: data.status === 'REFUNDED' ? 'COMPLETED' : 'PARTIALLY_REFUNDED',
      amount: {
        value: data.amount?.value || '0.00',
        currency_code: data.amount?.currency_code || 'EUR',
      },
      create_time: data.update_time || data.create_time || '',
    });
  }

  return refunds;
}
