'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Search } from 'lucide-react';

interface CityLink {
  name: string;
  slug: string;
  href: string;
}

const ALPHABET = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','Ö','P','Q','R','S','T','U','Ü','V','W','Z'] as const;

/** Map first character to its alphabet bucket (Ö→Ö, Ü→Ü, etc.) */
function letterBucket(name: string): string {
  const ch = name.charAt(0).toUpperCase();
  if (ALPHABET.includes(ch as typeof ALPHABET[number])) return ch;
  return ch;
}

export default function CityGrid({ cities }: { cities: CityLink[] }) {
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group cities by first letter
  const grouped = useMemo(() => {
    const map = new Map<string, CityLink[]>();
    for (const city of cities) {
      const letter = letterBucket(city.name);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(city);
    }
    return map;
  }, [cities]);

  // Letters that actually have cities
  const availableLetters = useMemo(() => new Set(grouped.keys()), [grouped]);

  // Filter by search
  const filteredGrouped = useMemo(() => {
    if (!search.trim() && !activeLetter) return grouped;
    const map = new Map<string, CityLink[]>();
    const q = search.toLowerCase().trim();
    Array.from(grouped.entries()).forEach(([letter, list]) => {
      if (activeLetter && letter !== activeLetter) return;
      const filtered = q ? list.filter(c => c.name.toLowerCase().includes(q)) : list;
      if (filtered.length > 0) map.set(letter, filtered);
    });
    return map;
  }, [grouped, search, activeLetter]);

  const totalFiltered = useMemo(() => {
    let n = 0;
    Array.from(filteredGrouped.values()).forEach(list => { n += list.length; });
    return n;
  }, [filteredGrouped]);

  const scrollToLetter = useCallback((letter: string) => {
    setActiveLetter(prev => prev === letter ? null : letter);
    setSearch('');
    const el = sectionRefs.current[letter];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const clearFilters = useCallback(() => {
    setActiveLetter(null);
    setSearch('');
  }, []);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="container-main">
        {/* Alphabet Navigation */}
        <nav className="flex flex-wrap justify-center gap-1.5 md:gap-2 mb-10">
          {ALPHABET.map(letter => {
            const has = availableLetters.has(letter);
            const isActive = activeLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => has && scrollToLetter(letter)}
                disabled={!has}
                className={`w-9 h-9 md:w-10 md:h-10 rounded-lg text-sm md:text-base font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-md'
                    : has
                    ? 'text-primary hover:bg-primary/10 hover:text-primary cursor-pointer'
                    : 'text-dark-200 cursor-default'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </nav>

        {/* Heading */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-3">
            Finde deine Stadt oder deinen Landkreis
          </h2>
          <p className="text-dark-500 text-lg max-w-2xl mx-auto">
            Egal ob Großstadt wie{' '}
            <Link href="/kfz-zulassung-in-deiner-stadt/berlin/" className="font-semibold text-primary hover:underline">Berlin</Link>,{' '}
            <Link href="/kfz-zulassung-in-deiner-stadt/hamburg/" className="font-semibold text-primary hover:underline">Hamburg</Link>,{' '}
            <Link href="/kfz-zulassung-in-deiner-stadt/muenchen/" className="font-semibold text-primary hover:underline">München</Link>{' '}
            oder in einem Landkreis – unser Service funktioniert bundesweit.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-300 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveLetter(null); }}
              placeholder="Stadt suchen..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-dark-100/50 bg-gray-50/80 text-dark-900 placeholder:text-dark-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
            {(search || activeLetter) && (
              <button
                onClick={clearFilters}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-dark-400 hover:text-primary transition-colors"
              >
                {totalFiltered} Ergebnis{totalFiltered !== 1 ? 'se' : ''} · ✕
              </button>
            )}
          </div>
        </div>

        {/* Grouped City Grid */}
        <div className="space-y-10">
          {ALPHABET.filter(l => filteredGrouped.has(l)).map(letter => (
            <div
              key={letter}
              ref={el => { sectionRefs.current[letter] = el; }}
              className="scroll-mt-24"
            >
              {/* Letter heading */}
              <div className="flex items-center gap-4 mb-5">
                <h3 className="text-2xl md:text-3xl font-bold text-primary shrink-0">{letter}</h3>
                <div className="h-px flex-1 bg-dark-100/60" />
              </div>

              {/* Cities in 4-col grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
                {filteredGrouped.get(letter)!.map(city => (
                  <Link
                    key={city.slug}
                    href={city.href}
                    className="group flex items-center gap-2.5 py-2 text-dark-700 hover:text-primary transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-dark-300 group-hover:text-primary transition-colors shrink-0" />
                    <span className="text-[15px] group-hover:translate-x-0.5 transition-transform">{city.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {totalFiltered === 0 && (
          <div className="text-center py-12 text-dark-400">
            <p className="text-lg">Keine Stadt gefunden für &bdquo;{search || activeLetter}&ldquo;</p>
            <p className="text-sm mt-1">
              Unser Service funktioniert deutschlandweit –{' '}
              <Link href="/kfz-service/kfz-online-service/" className="text-primary hover:underline">
                starten Sie direkt mit dem Online-Formular
              </Link>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
