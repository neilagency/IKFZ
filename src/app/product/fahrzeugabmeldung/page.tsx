import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/db';
import AbmeldungForm from '@/components/AbmeldungForm';
import { siteConfig } from '@/lib/config';

export const revalidate = 60; // re-fetch prices from DB every 60 seconds
import {
  Shield,
  Clock,
  CheckCircle,
  Phone,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Smartphone,
  Banknote,
} from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

export async function generateMetadata(): Promise<Metadata> {
  const product = await getProductBySlug('fahrzeugabmeldung');
  return {
    title: product?.heroTitle ?? 'Fahrzeug Online Abmelden',
    description:
      product?.metaDescription ??
      'Fahrzeug online abmelden – schnell, sicher und offiziell. Ohne Wartezeiten bei der Behörde. Ab 19,70 €.',
    alternates: {
      canonical: `${siteConfig.url}/product/fahrzeugabmeldung/`,
    },
    openGraph: {
      title: product?.heroTitle ?? 'Fahrzeug Online Abmelden',
      description:
        'KFZ Online Abmeldung in wenigen Minuten. Offiziell beim KBA registriert.',
      url: `${siteConfig.url}/product/fahrzeugabmeldung/`,
    },
  };
}

export default async function FahrzeugabmeldungPage() {
  const product = await getProductBySlug('fahrzeugabmeldung');
  if (!product || !product.isActive) notFound();

  const options = product.options ? JSON.parse(product.options) : {};
  const faq: { question: string; answer: string }[] = product.faq
    ? JSON.parse(product.faq)
    : [];
  const reservierungPrice = options.reservierung?.price ?? 4.70;

  return (
    <>
      {/* JSON-LD Product Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: product.name,
            provider: {
              '@type': 'Organization',
              name: siteConfig.company.name,
            },
            description: product.description,
            areaServed: 'DE',
            offers: {
              '@type': 'Offer',
              price: product.price?.toString(),
              priceCurrency: 'EUR',
              availability: 'https://schema.org/InStock',
            },
          }),
        }}
      />

      {/* FAQ Schema */}
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            }),
          }}
        />
      )}

      <div className="min-h-screen bg-white">
        {/* ── Dark Hero Band ── */}
        <div className="bg-dark-950 pt-24 pb-8 md:pt-32 md:pb-12 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        {/* ── Form Area ── */}
        <div className="container-main py-10 md:py-16">
          <div className="max-w-3xl mx-auto">
            <AbmeldungForm
              basePrice={product.price}
              reservierungPrice={reservierungPrice}
              productName={product.name}
            />
          </div>
        </div>

        {/* ── Trust Section ── */}
        <ScrollReveal>
          <div className="container-main pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    icon: Shield,
                    label: 'Offiziell beim KBA registriert',
                  },
                  {
                    icon: Clock,
                    label: 'Abmeldung in wenigen Minuten',
                  },
                  {
                    icon: CheckCircle,
                    label: '100% digital – ohne Behördentermin',
                  },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className="flex flex-col items-center text-center p-4 rounded-2xl bg-dark-50/50 border border-dark-100"
                  >
                    <badge.icon className="w-6 h-6 text-primary mb-2" />
                    <span className="text-xs font-medium text-dark-600">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Process Steps ── */}
        <ScrollReveal>
          <div className="bg-dark-50/50 py-16 md:py-20">
            <div className="container-main">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-dark-900 text-center mb-12">
                  So funktioniert die Online-Abmeldung
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      step: '1',
                      title: 'Formular ausfüllen',
                      desc: 'Geben Sie Ihre Fahrzeugdaten, Sicherheitscodes und Kennzeichen-Codes ein.',
                    },
                    {
                      step: '2',
                      title: 'Bestellung aufgeben',
                      desc: 'Überprüfen Sie Ihre Angaben und wählen Sie Ihre bevorzugte Zahlungsmethode.',
                    },
                    {
                      step: '3',
                      title: 'Wir melden Ihr Fahrzeug ab',
                      desc: 'Wir führen die Abmeldung offiziell über das i-Kfz Portal durch.',
                    },
                    {
                      step: '4',
                      title: 'Bestätigung erhalten',
                      desc: 'Sie erhalten Ihre Abmeldebestätigung per E-Mail.',
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="flex gap-4 items-start"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="font-bold text-dark-900">
                          {item.title}
                        </h3>
                        <p className="text-dark-500 text-sm mt-1">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Pricing ── */}
        <ScrollReveal>
          <div className="py-16 md:py-20">
            <div className="container-main">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-dark-900 text-center mb-8">
                  Kosten & Gebühren
                </h2>
                <div className="rounded-2xl border border-dark-100 shadow-sm overflow-hidden">
                  <div className="p-6 flex justify-between items-center border-b border-dark-100">
                    <div>
                      <p className="font-semibold text-dark-800">
                        Online-Abmeldung
                      </p>
                      <p className="text-xs text-dark-400 mt-0.5">
                        Inkl. Abmeldebestätigung per E-Mail
                      </p>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      {product.price.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <div className="p-6 flex justify-between items-center bg-dark-50/50">
                    <div>
                      <p className="font-semibold text-dark-800">
                        Kennzeichenreservierung (1 Jahr)
                      </p>
                      <p className="text-xs text-dark-400 mt-0.5">Optional</p>
                    </div>
                    <span className="text-xl font-bold text-dark-600">
                      + {reservierungPrice.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Payment Methods ── */}
        <ScrollReveal>
          <div className="bg-dark-50/50 py-16 md:py-20">
            <div className="container-main">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-dark-900 mb-8">
                  Zahlungsmethoden
                </h2>
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { icon: CreditCard, label: 'Kreditkarte' },
                    { icon: Smartphone, label: 'PayPal' },
                    { icon: Smartphone, label: 'Apple Pay' },
                    { icon: Banknote, label: 'SEPA-Lastschrift' },
                    { icon: CreditCard, label: 'Klarna' },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-dark-100"
                    >
                      <m.icon className="w-4 h-4 text-dark-500" />
                      <span className="text-sm text-dark-700">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <ScrollReveal>
            <div className="py-16 md:py-20">
              <div className="container-main">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-bold text-dark-900 text-center mb-8">
                    Häufig gestellte Fragen
                  </h2>
                  <FAQAccordion items={faq} />
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ── CTA ── */}
        <ScrollReveal>
          <div className="bg-dark-950 py-16 md:py-20">
            <div className="container-main text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Jetzt Fahrzeug online abmelden
              </h2>
              <p className="text-dark-300 mb-8 max-w-xl mx-auto">
                In wenigen Minuten – ohne Wartezeiten bei der Behörde.
                Offiziell über das i-Kfz Portal des KBA.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#top" className="btn-primary py-3 px-8">
                  Jetzt Abmelden – ab{' '}
                  {product.price.toFixed(2).replace('.', ',')} €
                </a>
                <a
                  href={`tel:${siteConfig.company.phone.replace(/\s/g, '')}`}
                  className="btn-outline-white py-3 px-8"
                >
                  <Phone className="w-4 h-4" /> Anrufen
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </>
  );
}

// ── FAQ Accordion (client component inlined) ──
function FAQAccordion({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return <FAQAccordionClient items={items} />;
}

// We need a client component for interactive FAQ
// Using a trick: export from a separate component or inline
// For simplicity, just render the FAQ statically (no accordion) in the server component
// and let the user toggle via CSS details/summary
function FAQAccordionClient({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <details
          key={i}
          className="group rounded-2xl border border-dark-100 overflow-hidden"
        >
          <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
            <span className="font-semibold text-dark-800 text-sm pr-4">
              {item.question}
            </span>
            <ChevronDown className="w-4 h-4 text-dark-400 flex-shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-5 text-sm text-dark-500 leading-relaxed">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
