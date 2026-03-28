import type { Metadata } from 'next';
import FAQ from '@/components/FAQ';
import { faqPageContent } from '@/lib/content';
import ScrollReveal from '@/components/ScrollReveal';
import { HelpCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ – Häufig gestellte Fragen zur IKFZ Digitalzulassung',
  description:
    'Alles, was Sie über Fahrzeuganmeldung, Ab/Ummeldung, eVB und Kennzeichen wissen müssen – einfach erklärt und übersichtlich dargestellt.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/faq/',
  },
};

export default function FAQPage() {
  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="container-main relative z-10 text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm text-sm text-white/70 mb-6">
                <HelpCircle className="w-4 h-4 text-primary" />
                Häufig gestellte Fragen
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                {faqPageContent.hero.title}
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto">
                {faqPageContent.hero.subtitle}
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqPageContent.sections.flatMap((section) =>
              section.items.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              }))
            ),
          }),
        }}
      />

      <FAQ sections={faqPageContent.sections} />
    </>
  );
}
