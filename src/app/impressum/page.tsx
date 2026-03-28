import type { Metadata } from 'next';
import { impressumContent } from '@/lib/content';
import ScrollReveal from '@/components/ScrollReveal';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Impressum – IKFZ Digital Zulassung',
  description: 'Impressum der iKFZ Digital Zulassung UG (haftungsbeschränkt). Angaben gemäß § 5 TMG.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/impressum',
  },
};

export default function ImpressumPage() {
  const { company, registration, management, responsible } = impressumContent;

  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="container-main relative z-10 text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm text-sm text-white/70 mb-6">
                <Building2 className="w-4 h-4 text-primary" />
                Rechtliche Angaben
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Impressum
              </h1>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="relative bg-dark py-20 md:py-28">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main relative z-10">
          <div className="max-w-3xl mx-auto space-y-8">
            <ScrollReveal>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Impressum – Angaben gemäß § 5 TMG
                </h2>
                <p className="text-white/60">
                  {company.name}<br />
                  {company.address}<br />
                  {company.city}<br />
                  {company.country}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  Handelsregister und zuständiges Gericht
                </h3>
                <ul className="space-y-2 text-white/60">
                  <li>Eingetragen im Handelsregister: {registration.court}</li>
                  <li>Handelsregisternummer: {registration.number}</li>
                  <li>Steuernummer: {registration.taxNumber}</li>
                  <li>Gesellschaftsvertrag: Der Gesellschaftsvertrag wurde am {registration.signedDate} unterzeichnet.</li>
                  <li>Tag der Eintragung: {registration.registrationDate}</li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  Vertretungsberechtigte und Geschäftsführung
                </h3>
                <ul className="space-y-2 text-white/60">
                  <li>Geschäftsführerin: {management.name}</li>
                  <li>
                    Vertretungsbefugnis: Frau {management.name} ist berechtigt, im Namen der Gesellschaft
                    mit sich im eigenen Namen oder als Vertreter eines Dritten Rechtsgeschäfte abzuschließen.
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  Verantwortlich gemäß § 55 Abs. 2 RStV
                </h3>
                <p className="text-white/60">
                  {responsible.name}<br />
                  {responsible.address}<br />
                  E-Mail: {responsible.email}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  Haftungsausschluss (Disclaimer)
                </h3>
                <h4 className="text-lg font-semibold text-white/80 mb-2">Haftung für Inhalte</h4>
                <p className="text-white/60 mb-4">
                  Wir sind gemäß § 7 Abs. 1 TMG für eigene Inhalte auf dieser Website
                  verantwortlich. Trotz sorgfältiger Erstellung können wir keine Haftung für die
                  Vollständigkeit, Richtigkeit oder Aktualität der Inhalte übernehmen.
                </p>
                <h4 className="text-lg font-semibold text-white/80 mb-2">Haftung für Links</h4>
                <p className="text-white/60">
                  Unsere Website enthält Links zu externen Webseiten Dritter. Auf deren Inhalte
                  haben wir keinen Einfluss. Zum Zeitpunkt der Verlinkung wurden die verlinkten
                  Seiten sorgfältig geprüft.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">
                  Hinweis gemäß § 36 VSBG
                </h3>
                <p className="text-white/60 mb-4">
                  Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor
                  einer Verbraucherschlichtungsstelle teilzunehmen.
                </p>
                <p className="text-white/60">
                  Die iKfz Digital Zulassung UG ist ein unabhängiger Dienstleister und agiert
                  eigenständig. Wir sind kein Teil des Kraftfahrt-Bundesamts (KBA) oder anderer
                  staatlicher Behörden.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
