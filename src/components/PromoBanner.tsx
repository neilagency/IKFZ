'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { X, Sparkles } from 'lucide-react';

interface PromoData {
  code: string;
  bannerText: string;
  discountType: string;
  discountValue: number;
}

const POLL_INTERVAL = 8_000; // 8 seconds — lightweight poll for near-real-time updates
const DISMISS_KEY = 'promo-dismissed';

function PromoBanner() {
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);
  const dismissedCodeRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch active promo from API (no-store to bypass cache)
  const fetchPromo = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/active-promo/', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      const newPromo: PromoData | null = data?.promo?.code ? data.promo : null;

      setPromo(newPromo);

      // If the promo code changed, reset dismiss state
      if (newPromo && newPromo.code !== dismissedCodeRef.current) {
        setDismissed(false);
      }
      // If no active promo, clear dismiss
      if (!newPromo) {
        setDismissed(false);
        dismissedCodeRef.current = null;
        try { sessionStorage.removeItem(DISMISS_KEY); } catch {}
      }
    } catch {
      // AbortError or network error — ignore
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    // Restore dismiss state for the same code
    try {
      dismissedCodeRef.current = sessionStorage.getItem(DISMISS_KEY) || null;
      if (dismissedCodeRef.current) setDismissed(true);
    } catch {}

    fetchPromo();
    const timer = setInterval(fetchPromo, POLL_INTERVAL);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [fetchPromo]);

  // Manage --promo-banner-height CSS variable
  useEffect(() => {
    const visible = !!promo && !dismissed;
    if (visible) {
      const updateHeight = () => {
        const h = bannerRef.current?.offsetHeight || 0;
        document.documentElement.style.setProperty('--promo-banner-height', `${h}px`);
      };
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => {
        window.removeEventListener('resize', updateHeight);
        document.documentElement.style.setProperty('--promo-banner-height', '0px');
      };
    } else {
      document.documentElement.style.setProperty('--promo-banner-height', '0px');
    }
  }, [promo, dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (promo) {
      dismissedCodeRef.current = promo.code;
      try { sessionStorage.setItem(DISMISS_KEY, promo.code); } catch {}
    }
  }, [promo]);

  const handleCopy = useCallback(async () => {
    if (!promo) return;
    try {
      await navigator.clipboard.writeText(promo.code);
    } catch {
      const input = document.createElement('input');
      input.value = promo.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [promo]);

  if (!promo || dismissed) return null;

  const discountLabel = promo.discountType === 'percentage'
    ? `${promo.discountValue}%`
    : `${promo.discountValue.toFixed(2).replace('.', ',')} €`;

  return (
    <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-10 py-3 flex items-center justify-center gap-2 sm:gap-3 text-center">
        <Sparkles className="w-5 h-5 flex-shrink-0 hidden sm:block text-white/70" />
        <span className="font-semibold text-sm sm:text-[15px]">
          {promo.bannerText || (<>Jetzt <span className="font-extrabold">{discountLabel} sparen</span> — Code:</>)}
        </span>
        <button
          onClick={handleCopy}
          className="bg-white text-primary hover:bg-white/90 font-extrabold tracking-widest px-4 py-1 rounded-md text-xs sm:text-sm transition-all shadow-sm"
        >
          {copied ? '✓ Kopiert!' : promo.code}
        </button>
        <button
          onClick={handleDismiss}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          aria-label="Banner schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default memo(PromoBanner);
