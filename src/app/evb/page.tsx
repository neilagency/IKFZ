import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileCheck, Clock, Zap, Shield, CheckCircle2, Phone, MessageCircle, ChevronDown, ShieldCheck, Car, ExternalLink, Handshake, Tag, Headphones, Package } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'eVB beantragen – Ihre schnelle Lösung',
  description:
    'eVB-Nummer schnell und einfach beantragen. Nutzen Sie unseren eVB Tarifrechner für Auto & Motorrad. In nur 2 Minuten Ihre eVB-Nummer erhalten!',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/evb/',
  },
};

const whyUs = [
  {
    icon: Zap,
    title: 'Kostenlose elektronische Versicherungsbestätigung',
    desc: 'Beantragen Sie Ihre elektronische Versicherungsbestätigung schnell und unkompliziert online – ohne versteckte Kosten oder lästige Formulare.',
  },
  {
    icon: Handshake,
    title: 'Unsere Partner-Versicherungsgesellschaften',
    desc: 'Wir arbeiten eng mit Fonds Finanz zusammen, die uns Zugang zu einer Vielzahl renommierter Versicherungsgesellschaften ermöglichen. Diese Partnerschaften bieten Ihnen eine breite Auswahl an Tarifen und Konditionen für Ihre Kfz-Versicherung.',
    partners: 'Admiral Direkt, Allianz, Bâloise, Bavaria, BGV Badische Versicherungen, DA Deutsche Allgemeine Versicherung AG, Dialog, Ergo, Europa, Friday, Itzehoer Versicherungen, Janitos, Kravag Allgemeine, Kravag Logistik (beides R+V), Lippische Landesbrandversicherung, Neo Digital, Nürnberger Allgemeine, Nürnberger Beamte, Nürnberger Granate, R+V, Sparkassen Direktversicherung, Versicherungskammer Bayern, Verti, VHV, Volkswohlbund, Württembergische und Zürich Versicherung.',
  },
  {
    icon: Shield,
    title: 'Kfz-Versicherung',
    desc: 'Wir arbeiten mit führenden Versicherern wie Allianz, R+V und Verti zusammen, um Ihnen die besten Tarife und Konditionen anzubieten. Vertrauen Sie auf unser Netzwerk und lassen Sie uns die Versicherung für Sie erledigen!',
  },
  {
    icon: Car,
    title: 'Fahrzeuganmeldung und -abmeldung',
    desc: 'Nie wieder lange Wartezeiten in der Zulassungsbehörde! Unser Team übernimmt die komplette Anmeldung oder Abmeldung Ihres Fahrzeugs für Sie.',
    link: { href: '/kfz-service/kfz-online-service/', label: 'Hier erfahren Sie mehr über die Fahrzeugabmeldung.' },
  },
  {
    icon: Tag,
    title: 'Kennzeichen direkt bei uns erwerben',
    desc: 'Sie können sogar die Kennzeichen für Ihr Fahrzeug direkt bei uns erwerben – alles an einem Ort, ohne zusätzlichen Aufwand.',
  },
  {
    icon: Package,
    title: 'Kompletter Service',
    desc: 'Von der ersten Anfrage bis zur endgültigen Zulassung – wir bieten Ihnen einen Rundum-Service, damit Sie sich um nichts kümmern müssen.',
  },
];

const steps = [
  { num: 1, title: 'Elektronische Versicherungsbestätigung beantragen', desc: 'Füllen Sie einfach unser Online-Formular aus, und Sie erhalten Ihre eVB innerhalb kürzester Zeit.' },
  { num: 2, title: 'Passende Kfz-Versicherung auswählen', desc: 'Unser Team berät Sie gerne und hilft Ihnen, die beste Versicherungslösung für Ihr Fahrzeug zu finden.' },
  { num: 3, title: 'Anmeldung oder Abmeldung übernehmen lassen', desc: 'Wir kümmern uns um alle notwendigen Schritte und halten Sie stets auf dem Laufenden.' },
  { num: 4, title: 'Kennzeichen direkt erwerben', desc: 'Wählen Sie Ihr Wunschkennzeichen und starten Sie mit Ihrem Fahrzeug sofort durch – ohne zusätzliche Wartezeiten.' },
];

const faqItems = [
  { q: 'Was ist eine eVB?', a: 'Die elektronische Versicherungsbestätigung ist ein digitaler Nachweis, dass Ihr Fahrzeug versichert ist. Ohne diesen Code können Sie Ihr Fahrzeug nicht zulassen.' },
  { q: 'Wie lange ist die elektronische Versicherungsbestätigung gültig?', a: 'Die elektronische Versicherungsbestätigung ist in der Regel für einen Zeitraum von bis zu 6 Monaten gültig. Es ist wichtig, Ihr Fahrzeug innerhalb dieser Frist anzumelden.' },
  { q: 'Kann ich die eVB auch für ein Fahrzeug verwenden, das ich nicht selbst besitze?', a: 'Ja, Sie können eine eVB für ein Fahrzeug beantragen, das nicht auf Ihren Namen zugelassen ist, sofern Sie die Zustimmung des Fahrzeughalters haben.' },
];

const beantragungSteps = [
  { num: 1, title: 'Online-Beantragung', desc: 'Füllen Sie unser kurzes Formular aus, und Sie erhalten Ihre eVB in wenigen Minuten.' },
  { num: 2, title: 'Übermittlung an die Zulassungsstelle', desc: 'Sobald Sie die elektronische Versicherungsbestätigung erhalten haben, wird diese automatisch digital an die zuständige Behörde übermittelt.' },
  { num: 3, title: 'Gültigkeit', desc: 'Die elektronische Versicherungsbestätigung ist in der Regel bis zu 6 Monate gültig. Nutzen Sie diesen Zeitraum, um Ihr Fahrzeug anzumelden.' },
];

export default function EVBPage() {
  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-20 relative">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="flex items-center gap-2 text-white/50 text-sm font-medium mb-4">
                <Link href="/kfz-services/" className="hover:text-primary transition-colors">Dienstleistungen</Link>
                <span>/</span>
                <span className="text-white/70">eVB</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                eVB beantragen<br />
                <span className="text-primary">Ihre schnelle Lösung!</span>
              </h1>
              <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-8">
                Nutzen Sie unseren schnellen und einfachen eVB Tarifrechner für Auto &amp; Motorrad
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/kfz-versicherung-berechnen/" className="btn-primary text-lg">
                  Auto Versicherung <ArrowRight className="w-5 h-5" />
                </Link>
                <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline-white">
                  <MessageCircle className="w-5 h-5" /> WhatsApp
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Tarifrechner Links ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-dark-900 mb-4">
                  In nur 2 Minuten können Sie Ihre eVB-Nummer für Ihr Auto oder Motorrad erhalten!
                </h2>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <a
                  href="https://a.partner-versicherung.de/click.php?partner_id=184294&ad_id=1604&deep=kfz-versicherung"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl bg-primary/5 border-2 border-primary/20 p-8 text-center hover:shadow-card hover:border-primary/40 transition-all duration-300"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/15 transition-colors">
                    <Car className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-dark-900 mb-2">Auto Versicherung</h3>
                  <p className="text-dark-500 text-sm mb-4">Kfz-Versicherung vergleichen und eVB erhalten</p>
                  <span className="inline-flex items-center gap-2 text-primary font-semibold">
                    Jetzt berechnen <ArrowRight className="w-4 h-4" />
                  </span>
                </a>
                <a
                  href="https://a.partner-versicherung.de/click.php?partner_id=184294&ad_id=1362&deep=motorradversicherung"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl bg-primary/5 border-2 border-primary/20 p-8 text-center hover:shadow-card hover:border-primary/40 transition-all duration-300"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/15 transition-colors">
                    <Car className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-dark-900 mb-2">Motorrad Versicherung</h3>
                  <p className="text-dark-500 text-sm mb-4">Motorradversicherung vergleichen und eVB erhalten</p>
                  <span className="inline-flex items-center gap-2 text-primary font-semibold">
                    Jetzt berechnen <ArrowRight className="w-4 h-4" />
                  </span>
                </a>
              </div>
              <p className="text-dark-400 text-xs text-center leading-relaxed">
                Die Links und Buttons auf dieser Seite enthalten sogenannte Affiliate-Links. Das bedeutet, dass wir eine Provision erhalten, wenn Sie über diese Links eine Versicherung abschließen. Für Sie entstehen dabei keinerlei zusätzliche Kosten. Wir danken Ihnen für Ihre Unterstützung!
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Rundum-Service: Warum uns? ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Ihr Rundum-Service</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-dark-900">eVB beantragen – Ihr Rundum-Service</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.05}>
              <div className="mb-10">
                <h3 className="text-xl font-bold text-dark-900 mb-6">Warum sollten Sie sich für uns entscheiden?</h3>
                <div className="space-y-5">
                  {whyUs.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="rounded-2xl bg-white border border-dark-100 p-6 md:p-8">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-dark-900 mb-2">{item.title}</h4>
                            <p className="text-dark-600 text-sm leading-relaxed">{item.desc}</p>
                            {item.partners && (
                              <p className="text-dark-500 text-xs mt-3 leading-relaxed">
                                <span className="font-medium text-dark-700">Zu unseren Partnergesellschaften gehören: </span>
                                {item.partners}
                              </p>
                            )}
                            {item.link && (
                              <Link href={item.link.href} className="inline-flex items-center gap-2 text-primary text-sm font-medium mt-3 hover:gap-3 transition-all">
                                {item.link.label} <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── So funktioniert es – 4 Schritte ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">So funktioniert es</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-dark-900">In 4 Schritten zur eVB-Nummer</h2>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-6">
              {steps.map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="flex items-start gap-4 rounded-2xl bg-gray-50 border border-dark-100 p-6">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">{item.num}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-dark-900 mb-1">{item.title}</h3>
                      <p className="text-dark-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Häufige Fragen zur eVB ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">FAQ</span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-dark-900">Häufige Fragen zur eVB</h2>
              </div>
            </ScrollReveal>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <ScrollReveal key={i} delay={i * 0.05}>
                  <details className="group rounded-2xl bg-white border border-dark-100 overflow-hidden">
                    <summary className="flex items-center justify-between cursor-pointer p-6 hover:bg-gray-50 transition-colors">
                      <span className="font-semibold text-dark-900 pr-4">{item.q}</span>
                      <ChevronDown className="w-5 h-5 text-dark-400 flex-shrink-0 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="px-6 pb-6 text-dark-600 leading-relaxed text-sm">{item.a}</div>
                  </details>
                </ScrollReveal>
              ))}
            </div>
            <ScrollReveal delay={0.2}>
              <div className="mt-6 text-center">
                <a
                  href="https://www.kba.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:gap-3 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  Für weitere Informationen besuchen Sie die offizielle Website des Kraftfahrt-Bundesamts (KBA)
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Fazit ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-8 md:p-10">
                <h3 className="text-xl font-bold text-dark-900 mb-4">Fazit</h3>
                <p className="text-dark-600 leading-relaxed">
                  Mit unserem umfassenden Service sparen Sie Zeit und Nerven. Egal, ob Sie eine neue elektronische Versicherungsbestätigung benötigen, Ihr Fahrzeug anmelden oder abmelden möchten, oder die passende Versicherung suchen – wir sind Ihr zuverlässiger Partner. Vertrauen Sie auf unsere Erfahrung und lassen Sie uns gemeinsam alle Formalitäten erledigen.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Weitere Services ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-extrabold text-dark-900">Weitere Services von iKFZ Digitalzulassung</h3>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="grid sm:grid-cols-3 gap-5">
                <Link href="/kfz-service/kfz-online-service/" className="group rounded-2xl bg-white border border-dark-100 p-6 text-center hover:shadow-card hover:border-primary/20 transition-all duration-300">
                  <h4 className="font-bold text-dark-900 group-hover:text-primary transition-colors mb-1">KFZ online anmelden</h4>
                  <span className="text-dark-400 text-xs">Jetzt starten</span>
                </Link>
                <Link href="/kfz-service/kfz-online-service/" className="group rounded-2xl bg-white border border-dark-100 p-6 text-center hover:shadow-card hover:border-primary/20 transition-all duration-300">
                  <h4 className="font-bold text-dark-900 group-hover:text-primary transition-colors mb-1">Online KFZ abmelden</h4>
                  <span className="text-dark-400 text-xs">Jetzt starten</span>
                </Link>
                <Link href="/evb/" className="group rounded-2xl bg-primary/5 border-2 border-primary/20 p-6 text-center">
                  <h4 className="font-bold text-primary mb-1">eVB-Nummer anfordern</h4>
                  <span className="text-dark-400 text-xs">Aktuelle Seite</span>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Was ist eine eVB? – Detailed ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-extrabold text-dark-900">Was ist eine eVB und wie funktioniert sie?</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl bg-gray-50 border border-dark-100 p-8 md:p-10 space-y-6">
                <p className="text-dark-600 leading-relaxed">
                  Die elektronische Versicherungsbestätigung (eVB) ist ein digitaler Nachweis Ihrer Kfz-Haftpflichtversicherung. Sie wird benötigt, um ein Fahrzeug anzumelden, umzumelden oder wieder anzumelden. Die elektronische Versicherungsbestätigung besteht aus einem siebenstelligen alphanumerischen Code, der von Ihrer Versicherung ausgestellt wird. Mit diesem Code wird sichergestellt, dass Ihr Fahrzeug den gesetzlichen Versicherungsschutz hat.
                </p>

                <div>
                  <h3 className="text-xl font-bold text-dark-900 mb-4">So funktioniert die Beantragung:</h3>
                  <div className="space-y-4">
                    {beantragungSteps.map((item, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white font-bold text-sm">{item.num}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-dark-900 mb-1">{item.title}</h4>
                          <p className="text-dark-600 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-dark-600 leading-relaxed">
                  Falls Sie noch keine Versicherung haben, helfen wir Ihnen dabei, die passende Versicherung aus unserem Partnernetzwerk zu finden – schnell, unkompliziert und kostenlos.
                </p>

                <div className="mt-4">
                  <h4 className="font-bold text-dark-900 mb-3">Quellen und weiterführende Links:</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="https://www.kba.de/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> Kraftfahrt-Bundesamt (KBA) – Informationen zur Fahrzeugzulassung
                      </a>
                    </li>
                    <li>
                      <a href="https://www.gdv.de/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                        <ExternalLink className="w-3 h-3" /> Versicherungsverband GDV – eVB Informationen
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Final CTA (Dark) ── */}
      <section className="relative bg-dark-950 py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              <span className="text-primary">iKFZ Digitalzulassung</span> starten
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Fordern Sie jetzt Ihre kostenlose eVB an und starten Sie Ihre KFZ-Zulassung.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">
                KFZ online anmelden <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/kfz-service/kfz-online-service/" className="btn-outline-white">
                Online KFZ abmelden
              </Link>
              <Link href="/evb/" className="btn-outline-white">
                eVB-Nr anfordern
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
