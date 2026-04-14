'use client';

import { useState } from 'react';
import ScrollReveal from '@/components/ScrollReveal';
import { ChevronDown } from 'lucide-react';

interface CityFAQProps {
  title: string;
  items: { question: string; answer: string }[];
}

export default function CityFAQ({ title, items }: CityFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container-main">
        <ScrollReveal>
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              FAQ
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900">{title}</h2>
          </div>
        </ScrollReveal>

        <div className="max-w-3xl mx-auto space-y-3">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={Math.min(i * 0.05, 0.3)}>
              <div className="rounded-2xl border border-dark-100/50 bg-gray-50/50 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-dark-900 text-[0.95rem] leading-snug pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-200 ${
                      openIndex === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 md:px-6 md:pb-6 text-dark-500 leading-relaxed text-sm">
                    {item.answer}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
