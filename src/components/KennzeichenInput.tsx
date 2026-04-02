'use client';

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface KennzeichenInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Visual German license plate input.
 * Stores the full plate string (e.g. "BIE NE 74") in a single field
 * while displaying it in three segments to mimic the physical plate.
 */
export default function KennzeichenInput({
  value,
  onChange,
  error,
}: KennzeichenInputProps) {
  // Parse value into parts: city - letters - numbers
  const parts = parsePlate(value);

  const cityRef = useRef<HTMLInputElement>(null);
  const lettersRef = useRef<HTMLInputElement>(null);
  const numbersRef = useRef<HTMLInputElement>(null);

  // Auto-advance to next field
  const handleChange = useCallback(
    (
      segment: 'city' | 'letters' | 'numbers',
      raw: string,
      maxLen: number
    ) => {
      const cleaned = raw.toUpperCase().replace(/[^A-ZÄÖÜa-zäöü0-9]/g, '');
      const capped = cleaned.slice(0, maxLen);

      const next = { ...parts };
      next[segment] = capped;

      // Build combined value
      const combined = [next.city, next.letters, next.numbers]
        .filter(Boolean)
        .join(' ');
      onChange(combined);

      // Auto-tab forward when segment full
      if (capped.length >= maxLen) {
        if (segment === 'city') lettersRef.current?.focus();
        if (segment === 'letters') numbersRef.current?.focus();
      }
    },
    [parts, onChange]
  );

  // Auto-backspace to previous field
  const handleKeyDown = useCallback(
    (
      segment: 'city' | 'letters' | 'numbers',
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (e.key === 'Backspace' && parts[segment] === '') {
        if (segment === 'letters') cityRef.current?.focus();
        if (segment === 'numbers') lettersRef.current?.focus();
      }
    },
    [parts]
  );

  return (
    <div>
      <label className="block text-sm font-semibold text-dark-800 mb-2">
        Kennzeichen eintragen <span className="text-red-500">*</span>
      </label>

      <div
        className={cn(
          'relative flex items-stretch rounded-2xl border-2 bg-white overflow-hidden transition-all',
          error
            ? 'border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
            : 'border-dark-800 shadow-sm hover:shadow-md'
        )}
      >
        {/* ── EU Blue Stripe ── */}
        <div className="flex flex-col items-center justify-center bg-[#003DA5] px-3 py-3 shrink-0">
          {/* EU stars ring */}
          <svg
            viewBox="0 0 40 40"
            className="w-8 h-8 mb-0.5"
            fill="none"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              const cx = 20 + 14 * Math.cos(angle);
              const cy = 20 + 14 * Math.sin(angle);
              return (
                <polygon
                  key={i}
                  points={starPoints(cx, cy, 2.5, 1.2)}
                  fill="#FFD700"
                />
              );
            })}
          </svg>
          <span className="text-white font-bold text-xs tracking-wider">
            D
          </span>
        </div>

        {/* ── Plate Input Area ── */}
        <div className="flex flex-1 items-center gap-0">
          {/* City code */}
          <div className="relative flex flex-col items-center justify-center px-1 sm:px-2">
            <input
              ref={cityRef}
              type="text"
              value={parts.city}
              onChange={(e) => handleChange('city', e.target.value, 3)}
              onKeyDown={(e) => handleKeyDown('city', e)}
              placeholder="BIE"
              maxLength={3}
              className="w-[4.5rem] sm:w-20 text-center text-2xl sm:text-3xl font-bold tracking-[0.15em] uppercase bg-transparent text-dark-900 placeholder:text-dark-200 focus:outline-none py-3"
              aria-label="Stadtkennung"
            />
            {/* Green underline */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-primary" />
          </div>

          {/* ── Stickers / Divider ── */}
          <div className="flex flex-col items-center justify-center gap-0.5 px-1 sm:px-2 shrink-0">
            {/* HU / TÜV sticker */}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-[#4A90D9] flex items-center justify-center bg-white">
              <span className="text-[7px] sm:text-[8px] font-bold text-[#4A90D9] leading-none">
                HU
              </span>
            </div>
            {/* City badge */}
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-dark-300 bg-white flex items-center justify-center">
              <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-dark-400 flex items-center justify-center">
                <span className="text-[5px] font-bold text-dark-600">⚡</span>
              </div>
            </div>
          </div>

          {/* Letters */}
          <div className="px-1 sm:px-2">
            <input
              ref={lettersRef}
              type="text"
              value={parts.letters}
              onChange={(e) => handleChange('letters', e.target.value, 2)}
              onKeyDown={(e) => handleKeyDown('letters', e)}
              placeholder="NE"
              maxLength={2}
              className="w-14 sm:w-16 text-center text-2xl sm:text-3xl font-bold tracking-[0.15em] uppercase bg-transparent text-dark-900 placeholder:text-dark-200 focus:outline-none py-3"
              aria-label="Buchstaben"
            />
          </div>

          {/* Numbers */}
          <div className="px-1 sm:px-2 flex-1 min-w-0">
            <input
              ref={numbersRef}
              type="text"
              value={parts.numbers}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                const next = { ...parts, numbers: digits };
                onChange(
                  [next.city, next.letters, next.numbers]
                    .filter(Boolean)
                    .join(' ')
                );
              }}
              onKeyDown={(e) => handleKeyDown('numbers', e)}
              placeholder="74"
              maxLength={4}
              inputMode="numeric"
              className="w-14 sm:w-20 text-center text-2xl sm:text-3xl font-bold tracking-[0.15em] bg-transparent text-dark-900 placeholder:text-dark-200 focus:outline-none py-3"
              aria-label="Zahlen"
            />
          </div>
        </div>
      </div>

      <p className="text-dark-400 text-xs mt-2">
        Bitte exakt wie auf dem Schild eintragen. Gilt auch für E-Kennzeichen.
      </p>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

/* ── Helpers ── */

function parsePlate(val: string) {
  const parts = val
    .toUpperCase()
    .trim()
    .split(/[\s-]+/);
  return {
    city: parts[0] ?? '',
    letters: parts[1] ?? '',
    numbers: parts[2] ?? '',
  };
}

/** Generate SVG star polygon points string */
function starPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number
): string {
  return Array.from({ length: 10 })
    .map((_, i) => {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * 36 - 90) * (Math.PI / 180);
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    })
    .join(' ');
}
