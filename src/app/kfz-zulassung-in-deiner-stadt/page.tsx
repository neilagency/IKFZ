import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin, Shield, FileCheck, Clock, Phone, Globe, Zap, Headphones, CheckCircle2 } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { siteConfig } from '@/lib/config';
import prisma from '@/lib/db';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'KFZ-Zulassung in deiner Stadt – Alle Städte & Landkreise',
  description:
    'Finden Sie Ihren KFZ-Zulassungsservice in Ihrer Stadt. Online-Zulassung, Abmeldung & Ummeldung – deutschlandweit verfügbar in über 25 Städten und Landkreisen.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/kfz-zulassung-in-deiner-stadt/',
  },
};

function extractCityDisplay(title: string): string {
  const patterns = [
    /kfz[- ]zulassung[- ](?:in[- ])?(.+)/i,
    /zulassungsstelle[- ](.+)/i,
    /autoanmeldung[- ](.+)/i,
    /auto[- ]anmelden[- ](?:in[- ])?(.+)/i,
    /auto[- ]online[- ]anmelden[- ]oder[- ]abmelden[- ](?:im|in)[- ](?:landkreis|kreis|stadt)?[- ]?(.+)/i,
    /landkreis[- ](.+)/i,
    /^in[- ](.+)/i,
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  return title;
}

export default async function KfzZulassungStadtPage() {
  const cityPages = await prisma.page.findMany({
    where: { pageType: 'city', status: 'published' },
    select: { slug: true, title: true },
    orderBy: { title: 'asc' },
  });

  const cities = cityPages.map(p => ({
    name: extractCityDisplay(p.title),
    slug: p.slug,
    href: `/${p.slug}/`,
  }));

  return (
    <>
      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="pt-32 pb-16 md:pt-40 md:pb-24 relative">
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-medium text-primary border border-primary/20 mb-8">
                <MapPin className="w-4 h-4" />
                <span>Deutschlandweit verfügbar</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                KFZ-Zulassung<br />
                <span className="text-primary">in deiner Stadt</span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-8">
                Wählen Sie Ihre Stadt oder Ihren Landkreis und starten Sie Ihre Online-Zulassung, Abmeldung oder Ummeldung – bequem von zu Hause.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">
                  Direkt loslegen <ArrowRight className="w-5 h-5" />
                </Link>
                <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline-white">
                  <Phone className="w-5 h-5" /> WhatsApp Support
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="py-10 bg-gray-50 border-b border-dark-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: 'KBA registriert', desc: 'Offiziell beim Kraftfahrt-Bundesamt' },
              { icon: MapPin, label: `${cities.length}+ Städte`, desc: 'Regionen abgedeckt' },
              { icon: Clock, label: '24/7 verfügbar', desc: 'Auch am Wochenende' },
              { icon: FileCheck, label: 'Sofort-Bestätigung', desc: 'Per E-Mail erhalten' },
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

      {/* ── City Grid ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <ScrollReveal>
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Alle Standorte</span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900 mb-4">Wählen Sie Ihre Stadt</h2>
              <p className="text-dark-400 text-lg max-w-2xl mx-auto">
                Klicken Sie auf Ihre Stadt oder Region, um alle Details zu Ihrem lokalen Online-Zulassungsservice zu erfahren.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cities.map((city, i) => (
              <ScrollReveal key={city.slug} delay={i * 0.04}>
                <Link
                  href={city.href}
                  className="group relative flex items-center gap-4 p-5 rounded-2xl bg-gray-50 border border-dark-100/60 hover:shadow-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-dark-900 group-hover:text-primary transition-colors truncate">{city.name}</div>
                    <div className="text-xs text-dark-400">Online-Zulassung verfügbar</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-dark-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ── */}
      <section className="bg-dark-50/50 py-16 md:py-24">
        <div className="container-main">
          <ScrollReveal>
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">So funktioniert es</span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900 mb-4">In 3 Schritten zur Online-Zulassung</h2>
              <p className="text-dark-400 text-lg max-w-2xl mx-auto">
                Egal in welcher Stadt – der Ablauf ist immer gleich einfach.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { num: '1', title: 'Stadt wählen & Antrag starten', desc: 'Wählen Sie Ihre Stadt oben aus oder starten Sie direkt mit dem Online-Formular.' },
              { num: '2', title: 'Dokumente hochladen', desc: 'Laden Sie die nötigen Unterlagen bequem hoch – Fahrzeugschein, Personalausweis und ggf. eVB-Nummer.' },
              { num: '3', title: 'Bestätigung erhalten', desc: 'Nach Prüfung erhalten Sie Ihre Bestätigung per E-Mail – schnell und ohne Behördengang.' },
            ].map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.1}>
                <div className="relative bg-white rounded-3xl p-7 border border-dark-100/60 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 h-full">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 bg-primary/8 rounded-2xl flex items-center justify-center">
                      <span className="text-xl font-black text-primary">{step.num}</span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
                  </div>
                  <h3 className="text-lg font-bold text-dark-900 mb-2.5">{step.title}</h3>
                  <p className="text-dark-400 leading-relaxed text-[0.95rem]">{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Vorteile</span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900">Warum IKFZ Digital Zulassung?</h2>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Globe, title: 'Deutschlandweit', desc: 'Ein Service für alle Städte und Landkreise in ganz Deutschland.' },
              { icon: Zap, title: 'Schnell & Digital', desc: 'Kein Warten, kein Papierkram – alles online in wenigen Minuten.' },
              { icon: Shield, title: 'KBA registriert', desc: 'Offiziell registrierter i-Kfz Dienstleister beim Kraftfahrt-Bundesamt.' },
              { icon: Headphones, title: 'Persönlicher Support', desc: 'Bei Fragen helfen wir Ihnen schnell per WhatsApp oder Telefon.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className="group text-center rounded-2xl bg-gray-50 border border-dark-100 p-8 hover:shadow-card hover:border-primary/20 transition-all duration-300 h-full">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mx-auto group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-dark-900 mb-2">{item.title}</h3>
                    <p className="text-dark-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Weitere Services</span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">Alles rund ums Fahrzeug</h2>
              </div>
            </ScrollReveal>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Kostenlose eVB-Nummer', href: '/evb/', desc: 'Elektronische Versicherungsbestätigung' },
                { label: 'KFZ-Versicherung berechnen', href: '/kfz-versicherung-berechnen/', desc: 'Günstige Tarife vergleichen' },
                { label: 'Auto verkaufen', href: '/auto-verkaufen/', desc: 'Schnell und einfach online' },
                { label: 'Zum Blog', href: '/blog/', desc: 'Tipps & Insiderwissen' },
              ].map((svc, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <Link
                    href={svc.href}
                    className="group flex items-center gap-4 rounded-2xl bg-white border border-dark-100 p-6 hover:shadow-card hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-dark-900 group-hover:text-primary transition-colors">{svc.label}</div>
                      <div className="text-xs text-dark-400">{svc.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-dark-300 group-hover:text-primary transition-all flex-shrink-0" />
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
              Ihre Stadt nicht dabei? <span className="text-primary">Kein Problem!</span>
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Unser Service funktioniert deutschlandweit – starten Sie jetzt Ihre Online-Zulassung.
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
