import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, Calculator, Phone } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'KFZ-Versicherung in 2 Minuten berechnen – Einfach & Schnell',
  description:
    'Berechne deine KFZ-Versicherung in nur 2 Minuten! Schnell, einfach und kostenlos online vergleichen und die beste Versicherung finden. Starte jetzt!',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/kfz-versicherung-berechnen/',
  },
};

export default function KfzVersicherungPage() {
  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-20 relative">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/15 to-transparent rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-radial from-accent/10 to-transparent rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="flex items-center gap-2 text-white/50 text-sm font-medium mb-4">
                <Link href="/kfz-services/" className="hover:text-primary transition-colors">Dienstleistungen</Link>
                <span>/</span>
                <Link href="/evb/" className="hover:text-primary transition-colors">Versicherung/eVB</Link>
                <span>/</span>
                <span className="text-white/70">KFZ-Versicherung berechnen</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                KFZ-Versicherung<br />
                <span className="text-primary">berechnen</span>
              </h1>
              <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-8">
                Berechne deine KFZ-Versicherung in nur 2 Minuten! Schnell, einfach und kostenlos online vergleichen und die beste Versicherung finden.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#rechner" className="btn-primary text-lg">
                  Jetzt berechnen <Calculator className="w-5 h-5" />
                </a>
                <a href={siteConfig.links.phone} className="btn-outline-white">
                  <Phone className="w-5 h-5" /> Beratung
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Calculator Widget ── */}
      <section id="rechner" className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-dark-900">KFZ-Versicherung berechnen in 2 Minuten</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl border border-dark-100 shadow-sm p-4 md:p-8 bg-gray-50">
                <div style={{ width: '100%' }} id="tcpp-iframe-kfz" />
                <Script
                  src="https://form.partner-versicherung.de/widgets/184294/tcpp-iframe-kfz/kfz-iframe.js"
                  strategy="afterInteractive"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── CTA (Dark) ── */}
      <section className="relative bg-dark-950 py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/8 to-transparent rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Fahrzeugzulassung online – <span className="text-primary">schnell & bequem!</span>
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              An-, Um- oder Abmeldung direkt von zu Hause erledigen.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">
                Jetzt Service starten <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/evb/" className="btn-outline-white">
                eVB-Nummer anfordern
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
