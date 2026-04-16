import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/db';
import ServiceForm from './ServiceForm';

// ── Types ──
interface ProductOption {
  id: string;
  name: string;
  type: string;
  choices?: { label: string; price_adjustment: number }[];
}

// ── SEO Metadata ──
export async function generateMetadata(): Promise<Metadata> {
  let title = 'Fahrzeugabmeldung Online';
  let description =
    'Schnell und sicher Ihr Fahrzeug online abmelden – bequem von zu Hause aus.';

  try {
    const product = await getProductBySlug('fahrzeugabmeldung');
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
      canonical: 'https://ikfzdigitalzulassung.de/product/fahrzeugabmeldung/',
    },
    openGraph: {
      title,
      description,
      url: 'https://ikfzdigitalzulassung.de/product/fahrzeugabmeldung/',
      siteName: 'IKFZ Digital-Zulassung',
      type: 'website',
    },
  };
}

// ── Page (Server Component) ──
export default async function Page() {
  let basePrice = 19.7;
  let reservierungPrice = 4.7;

  try {
    const product = await getProductBySlug('fahrzeugabmeldung');
    if (product) {
      basePrice = product.price;
      const options: ProductOption[] = JSON.parse(
        (product as any).options || '[]'
      );
      const resOption = options.find((o) => o.id === 'reservierung');
      const resChoice = resOption?.choices?.find((c) =>
        c.label?.toLowerCase().includes('reservieren')
      );
      if (resChoice) reservierungPrice = resChoice.price_adjustment;
    }
  } catch {
    // Use defaults — ISR will re-fetch at runtime
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Fahrzeugabmeldung Online',
    description: 'Schnell und sicher Ihr Fahrzeug abmelden.',
    provider: {
      '@type': 'Organization',
      name: 'IKFZ Digital-Zulassung',
      url: 'https://ikfzdigitalzulassung.de',
    },
    areaServed: { '@type': 'Country', name: 'DE' },
    offers: {
      '@type': 'Offer',
      price: String(basePrice),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServiceForm
        basePrice={basePrice}
        reservierungPrice={reservierungPrice}
        settingsPhone="01522 4999190"
        settingsPhoneLink="tel:015224999190"
        settingsWhatsApp="https://wa.me/4915224999190"
        settingsEmail="info@ikfzdigitalzulassung.de"
      />
    </>
  );
}
