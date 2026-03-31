/**
 * Trigger Invoice — Deduplication Wrapper
 * =========================================
 * Prevents duplicate invoice emails for the same order.
 * Uses an in-memory Set with a 5-minute TTL to deduplicate concurrent
 * webhook/callback calls that both try to send the invoice.
 *
 * Usage:
 *   await triggerInvoiceEmail(orderId);
 */

import { generateAndSendInvoice } from '@/lib/invoice';

// In-memory deduplication set: orderId → timestamp when it was added
const inProgress = new Map<string, number>();

// 5-minute TTL in milliseconds
const TTL_MS = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  inProgress.forEach((ts, key) => {
    if (now - ts > TTL_MS) inProgress.delete(key);
  });
}

/**
 * Trigger invoice generation and email sending for an order.
 * Safe to call multiple times — only one will proceed within the TTL window.
 */
export async function triggerInvoiceEmail(
  orderId: string,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  cleanup();

  if (inProgress.has(orderId)) {
    console.log(
      `[trigger-invoice] Skipping duplicate trigger for order: ${orderId}`,
    );
    return { success: true, skipped: true };
  }

  // Mark as in-progress immediately to prevent concurrent duplicates
  inProgress.set(orderId, Date.now());

  try {
    const result = await generateAndSendInvoice(orderId);

    if (!result.success) {
      // Remove from deduplication set on failure so it can be retried
      inProgress.delete(orderId);
    }

    return result;
  } catch (err) {
    inProgress.delete(orderId);
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[trigger-invoice] Unexpected error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}
