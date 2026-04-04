import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import prisma from '@/lib/db';
import {
  CityHero, CityStatsBar, CitySteps, CityBenefits,
  CityServices, CityCTA,
} from '@/components/city/CityComponents';

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
      <CityHero
        badge="Deutschlandweit verfügbar"
        h1Parts={['KFZ-Zulassung', 'in deiner Stadt']}
        subtitle="Wählen Sie Ihre Stadt oder Ihren Landkreis und starten Sie Ihre Online-Zulassung, Abmeldung oder Ummeldung – bequem von zu Hause."
        ctaPrimary={{ label: 'Direkt loslegen', href: '/kfz-service/kfz-online-service/' }}
      />

      <CityStatsBar
        items={[
          { icon: 'Shield', label: 'KBA registriert', desc: 'Offiziell beim Kraftfahrt-Bundesamt' },
          { icon: 'MapPin', label: `${cities.length}+ Städte`, desc: 'Regionen abgedeckt' },
          { icon: 'Clock', label: '24/7 verfügbar', desc: 'Auch am Wochenende' },
          { icon: 'FileCheck', label: 'Sofort-Bestätigung', desc: 'Per E-Mail erhalten' },
        ]}
      />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {cities.map((city, i) => (
              <ScrollReveal key={city.slug} delay={Math.min(i * 0.03, 0.6)}>
                <Link
                  href={city.href}
                  className="group relative flex items-center gap-4 p-4 md:p-5 rounded-2xl bg-gray-50/80 border border-dark-100/50 hover:shadow-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
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

      <CitySteps
        title="In 3 Schritten zur Online-Zulassung"
        subtitle="Egal in welcher Stadt – der Ablauf ist immer gleich einfach."
        steps={[
          { num: '1', title: 'Stadt wählen & Antrag starten', desc: 'Wählen Sie Ihre Stadt oben aus oder starten Sie direkt mit dem Online-Formular.' },
          { num: '2', title: 'Dokumente hochladen', desc: 'Laden Sie die nötigen Unterlagen bequem hoch – Fahrzeugschein, Personalausweis und ggf. eVB-Nummer.' },
          { num: '3', title: 'Bestätigung erhalten', desc: 'Nach Prüfung erhalten Sie Ihre Bestätigung per E-Mail – schnell und ohne Behördengang.' },
        ]}
      />

      <CityBenefits
        title="Warum IKFZ Digital Zulassung?"
        items={[
          { icon: 'Globe', title: 'Deutschlandweit', desc: 'Ein Service für alle Städte und Landkreise in ganz Deutschland.' },
          { icon: 'Zap', title: 'Schnell & Digital', desc: 'Kein Warten, kein Papierkram – alles online in wenigen Minuten.' },
          { icon: 'Shield', title: 'KBA registriert', desc: 'Offiziell registrierter i-Kfz Dienstleister beim Kraftfahrt-Bundesamt.' },
          { icon: 'Headphones', title: 'Persönlicher Support', desc: 'Bei Fragen helfen wir Ihnen schnell per WhatsApp oder Telefon.' },
        ]}
      />

      <CityServices
        badge="Weitere Services"
        title="Alles rund ums Fahrzeug"
        columns={2}
        services={[
          { label: 'Kostenlose eVB-Nummer', href: '/evb/', desc: 'Elektronische Versicherungsbestätigung' },
          { label: 'KFZ-Versicherung berechnen', href: '/kfz-versicherung-berechnen/', desc: 'Günstige Tarife vergleichen' },
          { label: 'Auto verkaufen', href: '/auto-verkaufen/', desc: 'Schnell und einfach online' },
          { label: 'Zum Blog', href: '/insiderwissen/', desc: 'Tipps & Insiderwissen' },
        ]}
      />

      <CityCTA
        title="Ihre Stadt nicht dabei?"
        highlight="Kein Problem!"
        subtitle="Unser Service funktioniert deutschlandweit – starten Sie jetzt Ihre Online-Zulassung."
        secondaryCta={{ label: 'eVB-Nummer anfordern', href: '/evb/' }}
      />
    </>
  );
}
