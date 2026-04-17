import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/db';
import RegistrationForm from '@/components/RegistrationForm';

// ── SEO Metadata ──
export async function generateMetadata(): Promise<Metadata> {
  let title = 'Auto Online Anmelden – ab 99,70 €';
  let description =
    'Fahrzeug jetzt online anmelden in 5 Minuten. 10-Tage-Zulassungsbestätigung sofort per PDF. Ohne Termin, ohne Behördengang. Bundesweit gültig.';

  try {
    const product = await getProductBySlug('auto-online-anmelden');
    if (product) {
      title = (product as any).seoTitle || product.name || title;
      description =
        (product as any).seoDescription ||
        (product as any).shortDescription ||
        description;
    }
  } catch {
    // Use defaults
  }

  return {
    title,
    description,
    alternates: {
      canonical: 'https://ikfzdigitalzulassung.de/product/auto-online-anmelden/',
    },
    openGraph: {
      title: 'Auto Online Anmelden – KFZ Zulassung ab 99,70 €',
      description:
        'Fahrzeug jetzt online anmelden – Sofort-PDF, losfahren, Siegel per Post.',
      url: 'https://ikfzdigitalzulassung.de/product/auto-online-anmelden/',
      siteName: 'IKFZ Digital-Zulassung',
      type: 'website',
    },
  };
}

// ── Types ──
interface ServiceOption {
  key: string;
  label: string;
  price: number;
}

interface ProductOptions {
  services: ServiceOption[];
  kennzeichen_reserviert: { label: string; price: number };
  kennzeichen_bestellen: { label: string; price: number };
}

// ── Page (Server Component) ──
export default async function Page() {
  let productName = 'Auto Online Anmelden / Ummelden';
  let options: ProductOptions = {
    services: [
      { key: 'neuzulassung', label: 'Anmelden', price: 124.70 },
      { key: 'ummeldung', label: 'Ummelden', price: 119.70 },
      { key: 'wiederzulassung', label: 'Wiederzulassen', price: 99.70 },
      { key: 'neuwagen', label: 'Neuwagen Zulassung', price: 124.70 },
    ],
    kennzeichen_reserviert: { label: 'Reserviertes Kennzeichen', price: 24.70 },
    kennzeichen_bestellen: { label: 'Kennzeichen bestellen', price: 29.70 },
  };

  try {
    const product = await getProductBySlug('auto-online-anmelden');
    if (product) {
      productName = product.name;
      const parsed: ProductOptions = JSON.parse(
        (product as any).options || '{}'
      );
      if (parsed.services?.length) options = parsed;
    }
  } catch {
    // Use defaults
  }

  const lowestPrice = Math.min(...options.services.map((s) => s.price));

  const jsonLdService = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Auto Online Anmelden – KFZ Zulassung',
    description:
      'Online-Zulassung Ihres Fahrzeugs beim KBA. 10-Tage-PDF sofort, Original per Post in 2–3 Werktagen.',
    provider: {
      '@type': 'Organization',
      name: 'IKFZ Digital-Zulassung',
      url: 'https://ikfzdigitalzulassung.de',
    },
    areaServed: { '@type': 'Country', name: 'DE' },
    offers: {
      '@type': 'Offer',
      price: String(lowestPrice),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };

  const jsonLdOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'iKFZ Digital Zulassung UG',
    url: 'https://ikfzdigitalzulassung.de',
    logo: 'https://ikfzdigitalzulassung.de/logo.svg',
    telephone: '+4915224999190',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+4915224999190',
      contactType: 'customer service',
      availableLanguage: 'German',
    },
    sameAs: [
      'https://www.facebook.com/ikfzdigitalzulassung',
      'https://www.instagram.com/ikfz_digital_zulassung/',
      'https://www.youtube.com/@ikfzdigitalzulassung',
      'https://www.tiktok.com/@meldino_kfz',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdService) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />

      <h1 className="sr-only">Auto online anmelden</h1>

      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-14 md:pt-40 md:pb-16 relative">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/15 to-transparent rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-radial from-accent/10 to-transparent rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
      </section>

      {/* ── Form ── */}
      <div className="bg-gray-50 pb-16">
        <div className="max-w-3xl mx-auto px-4 -mt-8 relative z-10">
          <RegistrationForm productName={productName} options={options} />
        </div>
      </div>
    </>
  );
}
