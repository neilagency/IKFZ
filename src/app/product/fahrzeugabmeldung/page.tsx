import type { Metadata } from 'next';
import Image from 'next/image';
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

      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-14 md:pt-40 md:pb-16 relative">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/15 to-transparent rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-radial from-accent/10 to-transparent rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main relative z-10 text-center">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight">
              Jetzt Formular ausfüllen –<br className="hidden sm:block" />
              <span className="text-primary">in 2 Minuten offiziell abgemeldet</span>
            </h1>
            <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto mb-6">
              Schnell, sicher und bequem von zu Hause aus – ohne Wartezeit bei der Behörde.
            </p>
            <div className="flex justify-center">
              <Image
                src="/uploads/2025/02/KBA-NEU-e1739626430147.png"
                alt="KBA – Registriert beim Kraftfahrt-Bundesamt"
                width={180}
                height={72}
                sizes="180px"
                className="opacity-80"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Form ── */}
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
