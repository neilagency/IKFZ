import type { Metadata } from 'next';
import ScrollReveal from '@/components/ScrollReveal';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – IKFZ Digital Zulassung',
  description: 'Datenschutzerklärung der iKFZ Digital Zulassung UG. Informationen zur Erhebung und Verarbeitung Ihrer Daten.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/datenschutzerklarung',
  },
};

export default function DatenschutzPage() {
  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-20 md:pt-40 md:pb-28 relative">
          <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="container-main relative z-10 text-center">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm text-sm text-white/70 mb-6">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Datenschutz
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Datenschutzerklärung
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
                <h2 className="text-2xl font-bold text-white mb-4">1. Datenschutz auf einen Blick</h2>
                <h3 className="text-lg font-semibold text-white/80 mb-2">Allgemeine Hinweise</h3>
                <p className="text-white/60 leading-relaxed mb-4">
                  Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
                  personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
                  Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                </p>
                <h3 className="text-lg font-semibold text-white/80 mb-2">Datenerfassung auf dieser Website</h3>
                <p className="text-white/60 leading-relaxed mb-4">
                  Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber.
                  Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                </p>
                <p className="text-white/60 leading-relaxed">
                  Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei
                  kann es sich z.B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
                  Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website
                  durch unsere IT-Systeme erfasst.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.05}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">2. Verantwortliche Stelle</h2>
                <p className="text-white/60 leading-relaxed">
                  iKFZ Digital Zulassung UG (haftungsbeschränkt)<br />
                  Gerhard-Küchen-Straße 14<br />
                  45141 Essen<br />
                  Deutschland<br /><br />
                  Telefon: +49 1522 4999190<br />
                  E-Mail: info@ikfzdigitalzulassung.de
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">3. SSL-Verschlüsselung</h2>
                <p className="text-white/60 leading-relaxed">
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
                  vertraulicher Inhalte eine SSL-Verschlüsselung. Eine verschlüsselte Verbindung
                  erkennen Sie daran, dass die Adresszeile des Browsers von &ldquo;http://&rdquo; auf &ldquo;https://&rdquo;
                  wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">4. Cookies</h2>
                <p className="text-white/60 leading-relaxed">
                  Unsere Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf
                  Ihrem Rechner keinen Schaden an und enthalten keine Viren. Cookies dienen dazu,
                  unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen. Sie können
                  Ihren Browser so einstellen, dass Sie über das Setzen von Cookies informiert werden.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">5. Ihre Rechte</h2>
                <p className="text-white/60 leading-relaxed mb-4">
                  Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten
                  personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der
                  Datenverarbeitung sowie ein Recht auf Berichtigung oder Löschung dieser Daten.
                </p>
                <p className="text-white/60 leading-relaxed">
                  Hierzu sowie zu weiteren Fragen zum Thema personenbezogene Daten können Sie sich
                  jederzeit unter der im Impressum angegebenen Adresse an uns wenden.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-4">6. Partner</h2>
                <p className="text-white/60 leading-relaxed mb-4">
                  Für die sichere Identitätsverifizierung und die effiziente Abwicklung Ihrer
                  Zulassungsprozesse arbeiten wir mit folgenden Partnern zusammen:
                </p>
                <ul className="space-y-2 text-white/60">
                  <li>• <strong className="text-white/80">Verimi GmbH:</strong> Plattform für die digitale Verifizierung Ihrer Identität (Oranienstraße 91, 10969 Berlin).</li>
                  <li>• <strong className="text-white/80">My Digital Car:</strong> Plattform zur Verwaltung und Bearbeitung von Fahrzeug- und Halterdaten.</li>
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </>
  );
}
