'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';

interface PromoData {
  code: string;
  bannerText: string;
  discountType: string;
  discountValue: number;
}

export default function PromoBanner() {
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem('promo-dismissed')) return;

    fetch('/api/active-promo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.promo?.code) setPromo(data.promo);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (promo && !dismissed) {
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
    sessionStorage.setItem('promo-dismissed', '1');
  }, []);

  const handleCopy = useCallback(async () => {
    if (!promo) return;
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = promo.code;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
          Jetzt <span className="font-extrabold">{discountLabel} sparen</span> — Code:
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
