'use client';

import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import { MapPin, ArrowRight } from 'lucide-react';

interface NearbyCitiesProps {
  title: string;
  cities: { name: string; slug: string; href: string }[];
}

export default function NearbyCities({ title, cities }: NearbyCitiesProps) {
  if (!cities.length) return null;

  return (
    <section className="py-16 md:py-20 bg-gray-50/80">
      <div className="container-main">
        <ScrollReveal>
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Weitere Städte
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">{title}</h2>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 max-w-4xl mx-auto">
          {cities.map((city, i) => (
            <ScrollReveal key={city.slug} delay={Math.min(i * 0.05, 0.3)}>
              <Link
                href={city.href}
                className="group relative flex items-center gap-4 p-4 md:p-5 rounded-2xl bg-white border border-dark-100/50 hover:shadow-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-dark-900 group-hover:text-primary transition-colors truncate">
                    {city.name}
                  </div>
                  <div className="text-xs text-dark-400">Online-Zulassung verfügbar</div>
                </div>
                <ArrowRight className="w-4 h-4 text-dark-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
