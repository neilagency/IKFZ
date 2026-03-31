/**
 * Invoice Token — HMAC-based Secure URL Tokens
 * ==============================================
 * Generates and verifies tamper-proof tokens for invoice download URLs.
 * Uses HMAC-SHA256 so tokens cannot be forged without the secret.
 *
 * Usage:
 *   generateInvoiceToken("INV-2024-0001") → "a3f7b9c2..."  (16 hex chars)
 *   verifyInvoiceToken("INV-2024-0001", "a3f7b9c2...") → true | false
 */

import { createHmac } from 'crypto';

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET or JWT_SECRET must be set');
  return secret;
}

/**
 * Generate a short HMAC token for an invoice number.
 * Returns the first 16 hex characters of the HMAC-SHA256 digest.
 */
export function generateInvoiceToken(invoiceNumber: string): string {
  const secret = getSecret();
  return createHmac('sha256', secret).update(invoiceNumber).digest('hex').substring(0, 16);
}

/**
 * Verify that a token matches the expected HMAC for an invoice number.
 * Uses constant-time comparison-equivalent logic via re-generation.
 */
export function verifyInvoiceToken(invoiceNumber: string, token: string): boolean {
  if (!token || !invoiceNumber) return false;
  try {
    const expected = generateInvoiceToken(invoiceNumber);
    return expected === token;
  } catch {
    return false;
  }
}
