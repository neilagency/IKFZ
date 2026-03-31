import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Globe, Zap, BookOpen, Headphones, Shield, FileCheck, Clock, Phone, ExternalLink } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'KFZ-Zulassung in deiner Stadt – Deutschlandweit Online',
  description:
    'Kfz online abmelden – deutschlandweit. Unser digitaler Service ist überall nutzbar und spart Ihnen Zeit, Wege und unnötigen Aufwand.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/kfz-zulassung-in-deiner-stadt/',
  },
};

const serviceButtons = [
  {
    label: 'Auto jetzt online abmelden',
    href: 'https://onlineautoabmelden.com/',
    external: true,
  },
  {
    label: 'KFZ-Service starten',
    href: '/kfz-service/kfz-online-service/',
    external: false,
  },
  {
    label: 'Fragen & Antworten',
    href: '/faq/',
    external: false,
  },
  {
    label: 'Direkt Kontakt aufnehmen',
    href: '/',
    external: false,
  },
];

const benefits = [
  {
    icon: Globe,
    title: 'Deutschlandweit nutzbar',
    desc: 'Keine Stadtseite nötig – ein Service für ganz Deutschland.',
  },
  {
    icon: Zap,
    title: 'Schnell & digital',
    desc: 'Kein unnötiger Aufwand, kein langes Suchen nach der richtigen Stelle.',
  },
  {
    icon: BookOpen,
    title: 'Einfach erklärt',
    desc: 'Klarer Ablauf, verständlich und ohne komplizierte Begriffe.',
  },
  {
    icon: Headphones,
    title: 'Direkte Hilfe',
    desc: 'Bei Fragen helfen wir Ihnen schnell weiter.',
  },
];

const furtherServices = [
  { label: 'Kostenlose eVB-Nummer', href: '/evb/' },
  { label: 'Auto verkaufen', href: '/auto-verkaufen/' },
  { label: 'Versicherung berechnen', href: '/kfz-versicherung-berechnen/' },
  { label: 'Zum Blog', href: '/blog/' },
];

export default function KfzZulassungStadtPage() {
  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-24 relative">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="flex items-center gap-2 text-white/50 text-sm font-medium mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                <span>KFZ Zulassung Deutschlandweit</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                Kfz online abmelden<br />
                <span className="text-primary">– deutschlandweit</span>
              </h1>
              <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-8">
                Sie können Ihr Fahrzeug bei uns bequem online abmelden – ganz egal, ob Sie in Essen, Berlin, Hamburg, München, Köln oder in einer kleineren Stadt wohnen. Unser digitaler Service ist deutschlandweit nutzbar und spart Ihnen Zeit, Wege und unnötigen Aufwand.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">
                  KFZ-Service starten <ArrowRight className="w-5 h-5" />
                </Link>
                <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline-white">
                  <Phone className="w-5 h-5" /> WhatsApp Support
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Quick-Nav Stats ── */}
      <section className="py-10 bg-gray-50 border-b border-dark-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: 'KBA registriert', desc: 'Offiziell beim Kraftfahrt-Bundesamt' },
              { icon: FileCheck, label: 'Sofort-Bestätigung', desc: 'Per E-Mail erhalten' },
              { icon: Clock, label: '24/7 verfügbar', desc: 'Auch am Wochenende' },
              { icon: MapPin, label: 'Alle Regionen', desc: 'Deutschlandweit nutzbar' },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 0.08}>
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-dark-100 hover:shadow-card transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-dark-900 text-sm">{item.label}</div>
                    <div className="text-xs text-dark-500">{item.desc}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Buttons ── */}
      <section className="bg-white py-16 md:py-20">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Direkt loslegen</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">Wählen Sie Ihren Service</h2>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {serviceButtons.map((btn, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  {btn.external ? (
                    <a
                      href={btn.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-2xl bg-gray-50 border border-dark-100 p-5 hover:shadow-card hover:border-primary/30 transition-all duration-300"
                    >
                      <span className="font-bold text-dark-900 group-hover:text-primary transition-colors">{btn.label}</span>
                      <ExternalLink className="w-5 h-5 text-dark-300 group-hover:text-primary transition-colors" />
                    </a>
                  ) : (
                    <Link
                      href={btn.href}
                      className="group flex items-center justify-between rounded-2xl bg-gray-50 border border-dark-100 p-5 hover:shadow-card hover:border-primary/30 transition-all duration-300"
                    >
                      <span className="font-bold text-dark-900 group-hover:text-primary transition-colors">{btn.label}</span>
                      <ArrowRight className="w-5 h-5 text-dark-300 group-hover:text-primary transition-colors" />
                    </Link>
                  )}
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── So funktioniert die Online-Abmeldung ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="rounded-2xl bg-white border border-dark-100 p-8 md:p-10">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-extrabold text-dark-900">So funktioniert die Online-Abmeldung</h2>
                  </div>
                </div>
                <p className="text-dark-700 leading-relaxed">
                  Senden Sie uns einfach Ihre Angaben online. Wir prüfen alles und begleiten den Ablauf digital. Unser Service ist für Kunden aus ganz Deutschland geeignet – unabhängig davon, in welcher Stadt oder in welchem Landkreis das Fahrzeug zugelassen ist.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Vorteile ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Vorteile</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">Warum unser Service?</h2>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-6">
              {benefits.map((item, i) => {
                const Icon = item.icon;
                return (
                  <ScrollReveal key={i} delay={i * 0.08}>
                    <div className="group rounded-2xl bg-gray-50 border border-dark-100 p-8 hover:shadow-card hover:border-primary/20 transition-all duration-300">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-dark-900 mb-2">{item.title}</h3>
                      <p className="text-dark-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Weitere Services ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Weitere Services</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">Weitere Services für Sie</h2>
                <p className="text-dark-500 mt-3">schnell und unkompliziert</p>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {furtherServices.map((svc, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <Link
                    href={svc.href}
                    className="group flex items-center justify-between rounded-2xl bg-white border border-dark-100 p-6 hover:shadow-card hover:border-primary/30 transition-all duration-300"
                  >
                    <span className="font-bold text-dark-900 group-hover:text-primary transition-colors">{svc.label}</span>
                    <ArrowRight className="w-5 h-5 text-dark-300 group-hover:text-primary transition-colors" />
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA (Dark) ── */}
      <section className="relative bg-dark-950 py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Bereit für Ihre <span className="text-primary">Online-Zulassung</span>?
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Starten Sie jetzt und sparen Sie sich den Weg zur Zulassungsstelle – deutschlandweit.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">
                Jetzt Fahrzeug anmelden <ArrowRight className="w-5 h-5" />
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
