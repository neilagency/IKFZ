'use client';

import ScrollReveal from '@/components/ScrollReveal';

interface CityIntroProps {
  title: string;
  paragraphs: string[];
}

export default function CityIntro({ title, paragraphs }: CityIntroProps) {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container-main">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900">{title}</h2>
            </div>
          </ScrollReveal>
          <div className="space-y-5">
            {paragraphs.map((paragraph, i) => (
              <ScrollReveal key={i} delay={i * 0.08}>
                <p className="text-dark-500 text-lg leading-relaxed">{paragraph}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
