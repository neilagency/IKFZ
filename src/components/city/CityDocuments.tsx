'use client';

import ScrollReveal from '@/components/ScrollReveal';
import { CheckCircle2 } from 'lucide-react';

interface CityDocumentsProps {
  title: string;
  intro: string;
  items: string[];
}

export default function CityDocuments({ title, intro, items }: CityDocumentsProps) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50/60 to-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,168,90,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,90,0.015)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="container-main relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              Unterlagen
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900 mb-4">{title}</h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">{intro}</p>
          </div>
        </ScrollReveal>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-dark-100/50 shadow-sm p-6 md:p-8">
            <ul className="space-y-4">
              {items.map((item, i) => (
                <ScrollReveal key={i} delay={Math.min(i * 0.05, 0.3)}>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-dark-700 leading-relaxed">{item}</span>
                  </li>
                </ScrollReveal>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
