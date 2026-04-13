import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/db';
import AbmeldungForm from '@/components/AbmeldungForm';
import { siteConfig } from '@/lib/config';

export const revalidate = 60;
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
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-radial from-primary/12 to-transparent rounded-full pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-radial from-accent/8 to-transparent rounded-full pointer-events-none" />
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

        {/* ── Google Trust Badge ── */}
        <ScrollReveal>
          <div className="container-main pb-12">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white border border-dark-100 rounded-full px-5 py-2 shadow-sm">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-dark-700">5.0</span>
                <span className="text-xs text-dark-400">Google Bewertungen</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── SEO Intro Text ── */}
        <ScrollReveal>
          <div className="container-main pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="prose prose-sm max-w-none text-dark-600">
                <h2 className="text-xl font-bold text-dark-900 mb-4">
                  Fahrzeug online abmelden – schnell, sicher und offiziell
                </h2>
                <p>
                  Mit unserem Service können Sie Ihr Fahrzeug komplett online abmelden –
                  ohne Wartezeiten bei der Zulassungsstelle. Wir übernehmen die
                  Abmeldung offiziell über das i-Kfz Portal des Kraftfahrt-Bundesamtes (KBA).
                </p>
                <p>
                  Sie benötigen lediglich Ihren Fahrzeugschein (Zulassungsbescheinigung Teil I)
                  und die Sicherheitscodes Ihrer Kennzeichen-Stempelplaketten.
                  Der gesamte Vorgang dauert nur wenige Minuten.
                </p>
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

        {/* ── Kennzeichen Reservation Info ── */}
        <ScrollReveal>
          <div className="py-16 md:py-20">
            <div className="container-main">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-dark-900 text-center mb-8">
                  Kennzeichen reservieren lassen
                </h2>
                <div className="rounded-2xl bg-primary/[0.04] border border-primary/10 p-6 md:p-8">
                  <p className="text-dark-600 text-sm leading-relaxed mb-4">
                    Wenn Sie Ihr aktuelles Kennzeichen nach der Abmeldung behalten möchten,
                    können Sie es für bis zu <strong>12 Monate</strong> reservieren lassen.
                    So können Sie es bei einer späteren Anmeldung eines neuen Fahrzeugs
                    wiederverwenden.
                  </p>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-primary/20">
                    <div>
                      <p className="font-semibold text-dark-800">Reservierung für 1 Jahr</p>
                      <p className="text-xs text-dark-400">Zusätzlich zur Abmeldegebühr</p>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      + {reservierungPrice.toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Contact Section ── */}
        <ScrollReveal>
          <div className="bg-dark-50/50 py-16 md:py-20">
            <div className="container-main">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-dark-900 mb-4">
                  Wir helfen Ihnen gerne weiter
                </h2>
                <p className="text-dark-500 mb-8">
                  Bei Fragen zur Abmeldung sind wir für Sie erreichbar.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <a
                    href={`tel:${siteConfig.company.phone.replace(/\s/g, '')}`}
                    className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white border border-dark-100 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <Phone className="w-6 h-6 text-primary" />
                    <span className="font-semibold text-dark-800 text-sm">Telefon</span>
                    <span className="text-xs text-dark-400">{siteConfig.company.phone}</span>
                  </a>
                  <a
                    href={`https://wa.me/${siteConfig.company.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white border border-dark-100 hover:border-green-300 hover:shadow-sm transition-all"
                  >
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.634-1.215A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.142-.678-5.831-1.96l-.418-.312-2.75.721.734-2.683-.343-.544A9.715 9.715 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>
                    <span className="font-semibold text-dark-800 text-sm">WhatsApp</span>
                    <span className="text-xs text-dark-400">Nachricht senden</span>
                  </a>
                  <a
                    href={`mailto:${siteConfig.company.email || 'info@ikfzdigitalzulassung.de'}`}
                    className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white border border-dark-100 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="font-semibold text-dark-800 text-sm">E-Mail</span>
                    <span className="text-xs text-dark-400">{siteConfig.company.email || 'info@ikfzdigitalzulassung.de'}</span>
                  </a>
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
