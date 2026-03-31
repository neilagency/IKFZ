import type { Metadata } from 'next';
import ScrollReveal from '@/components/ScrollReveal';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen (AGB)',
  description: 'Allgemeine Geschäftsbedingungen (AGB) der iKFZ Digital Zulassung UG.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/agb/',
  },
};

export default function AGBPage() {
  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="container-main relative z-10 text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm text-sm text-white/70 mb-6">
                <FileText className="w-4 h-4 text-primary" />
                Geschäftsbedingungen
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Allgemeine Geschäftsbedingungen
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
                <h2 className="text-2xl font-bold text-white mb-4">§ 1 Geltungsbereich</h2>
                <p className="text-white/60 leading-relaxed">
                  Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die über
                  die Website ikfzdigitalzulassung.de der iKFZ Digital Zulassung UG (haftungsbeschränkt),
                  Gerhard-Küchen-Straße 14, 45141 Essen (nachfolgend &quot;Anbieter&quot;) geschlossen werden.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">§ 2 Vertragsgegenstand</h2>
                <p className="text-white/60 leading-relaxed mb-4">
                  Gegenstand des Vertrages ist die Vermittlung und Durchführung von digitalen
                  KFZ-Zulassungsdienstleistungen, insbesondere:
                </p>
                <ul className="space-y-2 text-white/60">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    Fahrzeuganmeldung (Neuzulassung)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    Fahrzeugabmeldung (Außerbetriebsetzung)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    Fahrzeugummeldung (Halterwechsel, Adressänderung)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    Kennzeichenreservierung
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    Vermittlung von eVB-Nummern
                  </li>
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">§ 3 Preise und Zahlung</h2>
                <p className="text-white/60 leading-relaxed mb-4">
                  Alle angegebenen Preise sind Endpreise und enthalten die gesetzliche Umsatzsteuer.
                  Zusätzliche Kosten wie Kennzeichenpreise oder behördliche Gebühren werden
                  transparent ausgewiesen.
                </p>
                <p className="text-white/60 leading-relaxed">
                  Die Bezahlung erfolgt über die auf der Website angebotenen Zahlungsmethoden:
                  PayPal, Visa, Mastercard, Apple Pay, Google Pay.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">§ 4 Widerrufsrecht</h2>
                <p className="text-white/60 leading-relaxed">
                  Als Verbraucher haben Sie das Recht, den Vertrag innerhalb von 14 Tagen ohne
                  Angabe von Gründen zu widerrufen. Das Widerrufsrecht erlischt, wenn die
                  Dienstleistung vollständig erbracht wurde und mit der Ausführung erst begonnen
                  wurde, nachdem der Verbraucher seine ausdrückliche Zustimmung erteilt hat.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">§ 5 Geld-zurück-Garantie</h2>
                <p className="text-white/60 leading-relaxed">
                  Ist die Zulassung aus technischen Gründen nicht möglich, erstatten wir die
                  Servicegebühr vollständig zurück. Dies gilt nicht für behördliche Gebühren,
                  die bereits abgeführt wurden.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">§ 6 Haftung</h2>
                <p className="text-white/60 leading-relaxed">
                  Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Bei
                  leichter Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher
                  Vertragspflichten und nur in Höhe des vertragstypischen, vorhersehbaren Schadens.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">§ 7 Schlussbestimmungen</h2>
                <p className="text-white/60 leading-relaxed mb-4">
                  Es gilt das Recht der Bundesrepublik Deutschland. Die Anwendung des
                  UN-Kaufrechts ist ausgeschlossen.
                </p>
                <p className="text-white/60 leading-relaxed">
                  Sollten einzelne Bestimmungen dieser AGB unwirksam sein, wird die Gültigkeit
                  der übrigen Bestimmungen davon nicht berührt.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
