'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

/* ── Cookie categories ─────────────────────────── */
export type CookieCategory =
  | 'necessary'
  | 'analytics'
  | 'marketing'
  | 'external_media';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  external_media: boolean;
}

export type ConsentStatus = 'pending' | 'accepted_all' | 'rejected_all' | 'custom';

export interface CookieConsentState {
  status: ConsentStatus;
  preferences: CookiePreferences;
  showBanner: boolean;
  showSettings: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  acceptSelected: (prefs: Partial<CookiePreferences>) => void;
  openSettings: () => void;
  closeSettings: () => void;
  reopenBanner: () => void;
  hasConsent: (category: CookieCategory) => boolean;
}

const STORAGE_KEY = 'cookie_consent';
const CONSENT_VERSION = 1;

const DEFAULT_PREFS: CookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  external_media: false,
};

const ALL_ACCEPTED: CookiePreferences = {
  necessary: true,
  analytics: true,
  marketing: true,
  external_media: true,
};

/* ── Google Consent Mode v2 helpers ────────────── */
function pushConsentDefault() {
  if (typeof window === 'undefined') return;

  const w = window as any;
  w.dataLayer = w.dataLayer || [];

  function gtag(...args: any[]) {
    w.dataLayer.push(args);
  }

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500,
  });
}

function pushConsentUpdate(prefs: CookiePreferences) {
  if (typeof window === 'undefined') return;

  const w = window as any;
  w.dataLayer = w.dataLayer || [];

  function gtag(...args: any[]) {
    w.dataLayer.push(args);
  }

  gtag('consent', 'update', {
    ad_storage: prefs.marketing ? 'granted' : 'denied',
    ad_user_data: prefs.marketing ? 'granted' : 'denied',
    ad_personalization: prefs.marketing ? 'granted' : 'denied',
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
    personalization_storage: prefs.external_media ? 'granted' : 'denied',
  });
}

/* ── Context ───────────────────────────────────── */
const CookieConsentContext = createContext<CookieConsentState | null>(null);

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return ctx;
}

/* ── Provider ──────────────────────────────────── */
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>('pending');
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFS);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    pushConsentDefault();

    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const saved = JSON.parse(raw);

        if (saved.version === CONSENT_VERSION && saved.preferences) {
          const normalizedPrefs: CookiePreferences = {
            ...DEFAULT_PREFS,
            ...saved.preferences,
            necessary: true,
          };

          setPreferences(normalizedPrefs);
          setStatus(saved.status || 'custom');
          pushConsentUpdate(normalizedPrefs);
          return;
        }
      }
    } catch {}

    let timeoutId: any = null;

    const show = () => setShowBanner(true);

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(show, { timeout: 1200 });
    } else if (typeof window !== 'undefined') {
      timeoutId = setTimeout(show, 800);
    }

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const saveConsent = useCallback(
    (prefs: CookiePreferences, newStatus: ConsentStatus) => {
      const normalizedPrefs: CookiePreferences = {
        ...DEFAULT_PREFS,
        ...prefs,
        necessary: true,
      };

      const data = {
        version: CONSENT_VERSION,
        status: newStatus,
        preferences: normalizedPrefs,
        timestamp: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setPreferences(normalizedPrefs);
      setStatus(newStatus);
      setShowBanner(false);
      setShowSettings(false);
      pushConsentUpdate(normalizedPrefs);
    },
    []
  );

  const acceptAll = useCallback(() => {
    saveConsent(ALL_ACCEPTED, 'accepted_all');
  }, [saveConsent]);

  const rejectAll = useCallback(() => {
    saveConsent(DEFAULT_PREFS, 'rejected_all');
  }, [saveConsent]);

  const acceptSelected = useCallback(
    (partial: Partial<CookiePreferences>) => {
      const merged: CookiePreferences = {
        ...DEFAULT_PREFS,
        ...partial,
        necessary: true,
      };
      saveConsent(merged, 'custom');
    },
    [saveConsent]
  );

  const hasConsent = useCallback(
    (cat: CookieCategory) => {
      if (cat === 'necessary') return true;
      return preferences[cat] === true;
    },
    [preferences]
  );

  return (
    <CookieConsentContext.Provider
      value={{
        status,
        preferences,
        showBanner,
        showSettings,
        acceptAll,
        rejectAll,
        acceptSelected,
        openSettings: () => setShowSettings(true),
        closeSettings: () => setShowSettings(false),
        reopenBanner: () => setShowBanner(true),
        hasConsent,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}
