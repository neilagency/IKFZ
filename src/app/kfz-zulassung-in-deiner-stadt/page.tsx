import type { Metadata } from 'next';
import { getCities } from '@/data/cities';
import {
  CityHero, CityStatsBar, CitySteps, CityBenefits,
  CityServices, CityCTA,
} from '@/components/city/CityComponents';
import CityGrid from '@/components/city/CityGrid';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'KFZ-Zulassung in deiner Stadt – Alle Städte & Landkreise',
  description:
    'Finden Sie Ihren KFZ-Zulassungsservice in Ihrer Stadt. Online-Zulassung, Abmeldung & Ummeldung – deutschlandweit verfügbar in über 700 Städten und Landkreisen.',
  alternates: {
    canonical: 'https://ikfzdigitalzulassung.de/kfz-zulassung-in-deiner-stadt/',
  },
};

export default async function KfzZulassungStadtPage() {
  const allCities = getCities();

  const cities = allCities
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map(c => ({
      name: c.name,
      slug: c.slug,
      href: `/kfz-zulassung-in-deiner-stadt/${c.slug}/`,
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

      <CityGrid cities={cities} />

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
