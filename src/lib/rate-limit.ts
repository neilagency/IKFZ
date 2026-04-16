/**
 * Simple in-memory rate limiter.
 * NOT distributed — suitable for single-process deployments.
 * Max 10,000 entries to prevent unbounded memory growth.
 */

import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10_000;
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000);
// Allow process to exit without waiting for this timer
if (_cleanupTimer.unref) _cleanupTimer.unref();

export function rateLimit(
  key: string,
  config: { maxRequests: number; windowMs: number }
): { success: boolean; reset: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Evict if at capacity
    if (store.size >= MAX_ENTRIES) {
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, reset: config.windowMs };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { success: false, reset: entry.resetAt - now };
  }

  return { success: true, reset: entry.resetAt - now };
}

export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
