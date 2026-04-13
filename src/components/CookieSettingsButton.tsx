'use client';

import { useCookieConsent } from '@/lib/cookie-consent';

export default function CookieSettingsButton() {
  const { reopenBanner } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={reopenBanner}
      className="text-white/30 hover:text-white/60 text-xs transition-colors"
    >
      Cookie-Einstellungen
    </button>
  );
}
