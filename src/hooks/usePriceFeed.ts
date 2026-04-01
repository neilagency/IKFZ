'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ProductFeedEntry {
  price: number;
  options: string | null;
}

export type PriceFeed = Record<string, ProductFeedEntry>;

/**
 * usePriceFeed — subscribes to the SSE endpoint `/api/prices/live` and returns
 * live product prices keyed by slug.  Falls back to 30-second polling via
 * `/api/prices/snapshot` if SSE is unavailable (e.g. shared-hosting proxy
 * kills long-lived connections).
 *
 * @param initialPrices  Server-rendered prices used as the initial state so
 *                       the UI shows correct values before SSE connects.
 */
export function usePriceFeed(initialPrices: PriceFeed = {}): PriceFeed {
  const [feed, setFeed] = useState<PriceFeed>(initialPrices);

  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingActiveRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      pollingActiveRef.current = false;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingActiveRef.current) return;
    pollingActiveRef.current = true;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/prices/snapshot');
        if (res.ok) setFeed(await res.json());
      } catch {
        /* network errors are silently ignored */
      }
    }, 30_000);
  }, []);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      startPolling();
      return;
    }

    try {
      const es = new EventSource('/api/prices/live');
      esRef.current = es;

      es.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'init') {
            stopPolling(); // SSE working — no need to poll
            setFeed(msg.prices as PriceFeed);
          } else if (msg.type === 'price_update') {
            setFeed((prev) => ({
              ...prev,
              [msg.slug]: { price: msg.price as number, options: msg.options as string | null },
            }));
          }
        } catch {
          /* ignore malformed messages */
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Fall back to polling while we wait to reconnect
        startPolling();
        retryRef.current = setTimeout(() => {
          if (retryRef.current) retryRef.current = null;
          connect();
        }, 60_000);
      };
    } catch {
      startPolling();
    }
  }, [startPolling, stopPolling]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
    // connect is stable (useCallback with stable deps), run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return feed;
}
