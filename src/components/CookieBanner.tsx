'use client';

import { useState } from 'react';
import { useCookieConsent, type CookiePreferences } from '@/lib/cookie-consent';
import { Shield, Settings, Cookie, ChevronDown, ChevronUp, X } from 'lucide-react';
import Link from 'next/link';

/* ── Category definitions ─────────────────────── */
const CATEGORIES = [
  {
    key: 'necessary' as const,
    label: 'Notwendig',
    description:
      'Diese Cookies sind für die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.',
    locked: true,
  },
  {
    key: 'analytics' as const,
    label: 'Analyse & Statistik',
    description:
      'Helfen uns zu verstehen, wie Besucher unsere Website nutzen (z.B. Google Analytics).',
    locked: false,
  },
  {
    key: 'marketing' as const,
    label: 'Marketing & Werbung',
    description:
      'Werden verwendet, um Besuchern relevante Werbung anzuzeigen (z.B. Google Ads, Facebook Pixel).',
    locked: false,
  },
  {
    key: 'external_media' as const,
    label: 'Externe Medien',
    description:
      'Erlaubt das Laden externer Inhalte wie YouTube-Videos, Google Maps und ähnlicher Dienste.',
    locked: false,
  },
];

/* ── Settings Panel ───────────────────────────── */
function SettingsPanel({
  onSave,
  onClose,
}: {
  onSave: (prefs: Partial<CookiePreferences>) => void;
  onClose: () => void;
}) {
  const { preferences } = useCookieConsent();
  const [local, setLocal] = useState<CookiePreferences>({ ...preferences });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-fade-in"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0d5581]" />
            <h2 id="cookie-settings-title" className="text-lg font-bold text-gray-900">
              Cookie-Einstellungen
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cookie-Einstellungen schließen"
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600 mb-4">
            Hier können Sie auswählen, welche Arten von Cookies Sie zulassen möchten.
            Notwendige Cookies sind immer aktiv.
          </p>

          {CATEGORIES.map((cat) => {
            const checkboxId = `cookie-${cat.key}`;
            const panelId = `cookie-panel-${cat.key}`;
            const isExpanded = expanded === cat.key;

            return (
              <div key={cat.key} className="border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : cat.key)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <label
                      htmlFor={checkboxId}
                      className="relative inline-flex items-center cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        id={checkboxId}
                        type="checkbox"
                        aria-label={cat.label}
                        checked={local[cat.key]}
                        disabled={cat.locked}
                        onChange={() => {
                          if (!cat.locked) {
                            setLocal((p) => ({ ...p, [cat.key]: !p[cat.key] }));
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-10 h-5 rounded-full peer-focus:ring-2 peer-focus:ring-[#0d5581]/30 transition-colors ${
                          cat.locked
                            ? 'bg-[#0d5581] cursor-not-allowed'
                            : local[cat.key]
                            ? 'bg-[#0d5581]'
                            : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            local[cat.key] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </label>

                    <span className="font-medium text-sm text-gray-900">{cat.label}</span>

                    {cat.locked && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Immer aktiv
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label={
                      isExpanded
                        ? `${cat.label} Beschreibung ausblenden`
                        : `${cat.label} Beschreibung anzeigen`
                    }
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(isExpanded ? null : cat.key);
                    }}
                    className="ml-2 p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div
                    id={panelId}
                    className="px-4 pb-3 text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-2"
                  >
                    {cat.description}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>

          <button
            type="button"
            onClick={() => onSave(local)}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-[#0d5581] rounded-xl hover:bg-[#0d5581]/90 transition-colors"
          >
            Auswahl speichern
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Banner ──────────────────────────────── */
export default function CookieBanner() {
  const consent = useCookieConsent();

  return (
    <>
      {consent.showSettings && (
        <SettingsPanel
          onSave={(prefs) => consent.acceptSelected(prefs)}
          onClose={consent.closeSettings}
        />
      )}

      {consent.showBanner && !consent.showSettings && (
        <div className="fixed bottom-0 inset-x-0 z-[10000] p-4 animate-slide-up">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-[#0d5581]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-[#0d5581]" />
                </div>

                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Wir respektieren Ihre Privatsphäre
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Wir verwenden Cookies, um Ihnen die bestmögliche Erfahrung auf unserer Website
                    zu bieten. Einige Cookies sind technisch notwendig, andere helfen uns, die
                    Website zu verbessern oder personalisierte Inhalte anzuzeigen.{' '}
                    <Link
                      href="/datenschutzerklarung/"
                      className="text-[#0d5581] hover:underline font-medium"
                    >
                      Datenschutzerklärung
                    </Link>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-[#aad137]" />
                  DSGVO-konform
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-[#aad137]" />
                  Keine Weitergabe an Dritte
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-[#aad137]" />
                  Jederzeit widerrufbar
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={consent.acceptAll}
                  className="flex-1 px-6 py-3 text-sm font-bold text-white bg-[#0d5581] rounded-xl hover:bg-[#0d5581]/90 transition-all hover:shadow-lg"
                >
                  Alle akzeptieren
                </button>

                <button
                  type="button"
                  onClick={consent.rejectAll}
                  className="flex-1 px-6 py-3 text-sm font-bold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Nur notwendige
                </button>

                <button
                  type="button"
                  onClick={consent.openSettings}
                  className="flex-1 px-6 py-3 text-sm font-medium text-[#0d5581] border border-[#0d5581]/30 rounded-xl hover:bg-[#0d5581]/5 transition-colors flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Einstellungen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
