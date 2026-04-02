import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductBySlug } from '@/lib/db';
import RegistrationForm from '@/components/RegistrationForm';
import { siteConfig } from '@/lib/config';

export const revalidate = 60; // re-fetch prices from DB every 60 seconds
import {
  Shield,
  Clock,
  CheckCircle,
  Phone,
  ChevronDown,
  CreditCard,
  Smartphone,
  Banknote,
} from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

export async function generateMetadata(): Promise<Metadata> {
  const product = await getProductBySlug('auto-online-anmelden');
  return {
    title: product?.heroTitle ?? 'Auto Online Anmelden',
    description:
      product?.metaDescription ??
      'Auto online anmelden, ummelden oder wiederzulassen – 100% digital. Ab 99,70 €. Offiziell beim KBA registriert.',
    alternates: {
      canonical: `${siteConfig.url}/product/auto-online-anmelden/`,
    },
    openGraph: {
      title: product?.heroTitle ?? 'Auto Online Anmelden',
      description:
        'KFZ Online Anmeldung / Ummeldung in wenigen Minuten. Offiziell beim KBA registriert.',
      url: `${siteConfig.url}/product/auto-online-anmelden/`,
    },
  };
}

export default async function AutoOnlineAnmeldenPage() {
  const product = await getProductBySlug('auto-online-anmelden');
  if (!product || !product.isActive) notFound();

  const options = product.options ? JSON.parse(product.options) : {};
  const faq: { question: string; answer: string }[] = product.faq
    ? JSON.parse(product.faq)
    : [];

  return (
    <>
      {/* JSON-LD Service Schema */}
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
              '@type': 'AggregateOffer',
              lowPrice: String(Math.min(...((options.services as Array<{price:number}>)?.map(s=>s.price) ?? [product.price]))),
              highPrice: String(Math.max(...((options.services as Array<{price:number}>)?.map(s=>s.price) ?? [product.price]))),
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
            <RegistrationForm
              productName={product.name}
              options={options}
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
                    label: 'Bearbeitung in 1-3 Werktagen',
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
          <div className="container-main pb-8">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white border border-dark-100 shadow-sm">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-dark-700 ml-1">5,0</span>
                <span className="text-xs text-dark-400">Google-Bewertungen</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── SEO Intro Text ── */}
        <ScrollReveal>
          <div className="container-main pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl bg-dark-50/50 border border-dark-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-dark-900 mb-3">
                  Auto online anmelden – einfach, schnell & offiziell
                </h2>
                <p className="text-sm text-dark-600 leading-relaxed mb-3">
                  Mit unserem digitalen Zulassungsservice melden Sie Ihr Fahrzeug
                  bequem von zu Hause aus an – ganz ohne Wartezeiten bei der
                  Zulassungsstelle. Ob Neuzulassung, Ummeldung bei Halterwechsel
                  oder Wiederzulassung eines stillgelegten Fahrzeugs: Wir
                  erledigen den kompletten Vorgang offiziell über das i-Kfz Portal
                  des KBA.
                </p>
                <p className="text-sm text-dark-600 leading-relaxed">
                  Sie laden Ihre Dokumente hoch, wir kümmern uns um den Rest. In
                  der Regel erhalten Sie Ihre Zulassungsbescheinigung innerhalb
                  von 1–3 Werktagen per E-Mail und Post.
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
                  So funktioniert die Online-Anmeldung
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      step: '1',
                      title: 'Formular ausfüllen',
                      desc: 'Wählen Sie Ihren Service, geben Sie die Fahrzeugdaten ein und laden Sie die erforderlichen Dokumente hoch.',
                    },
                    {
                      step: '2',
                      title: 'Bestellung aufgeben',
                      desc: 'Überprüfen Sie Ihre Angaben, wählen Sie Ihre Zahlungsmethode und schließen Sie die Bestellung ab.',
                    },
                    {
                      step: '3',
                      title: 'Wir bearbeiten Ihren Antrag',
                      desc: 'Wir führen die Zulassung offiziell über das i-Kfz Portal durch. Bearbeitung in 1-3 Werktagen.',
                    },
                    {
                      step: '4',
                      title: 'Zulassungsbescheinigung erhalten',
                      desc: 'Sie erhalten alle Unterlagen per E-Mail und Post.',
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 items-start">
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
                  Preisübersicht
                </h2>
                <div className="rounded-2xl border border-dark-100 shadow-sm overflow-hidden">
                  {(options.services ?? []).map(
                    (
                      svc: { key: string; label: string; price: number },
                      i: number
                    ) => (
                      <div
                        key={svc.key}
                        className={`p-6 flex justify-between items-center ${
                          i > 0 ? 'border-t border-dark-100' : ''
                        } ${i % 2 === 1 ? 'bg-dark-50/50' : ''}`}
                      >
                        <p className="font-semibold text-dark-800">
                          {svc.label}
                        </p>
                        <span className="text-xl font-bold text-primary">
                          {svc.price.toFixed(2).replace('.', ',')} €
                        </span>
                      </div>
                    )
                  )}
                  <div className="p-6 flex justify-between items-center border-t border-dark-100 bg-dark-50/50">
                    <div>
                      <p className="font-semibold text-dark-800">
                        Reserviertes Wunschkennzeichen
                      </p>
                      <p className="text-xs text-dark-400 mt-0.5">Optional</p>
                    </div>
                    <span className="text-lg font-bold text-dark-600">
                      + {(options.kennzeichen_reserviert?.price ?? 24.70).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                  <div className="p-6 flex justify-between items-center border-t border-dark-100">
                    <div>
                      <p className="font-semibold text-dark-800">
                        Kennzeichen bestellen & liefern
                      </p>
                      <p className="text-xs text-dark-400 mt-0.5">Optional</p>
                    </div>
                    <span className="text-lg font-bold text-dark-600">
                      + {(options.kennzeichen_bestellen?.price ?? 29.70).toFixed(2).replace('.', ',')} €
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

        {/* ── Contact Section ── */}
        <ScrollReveal>
          <div className="py-16 md:py-20">
            <div className="container-main">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-dark-900 mb-4">
                  Wir helfen Ihnen gerne weiter
                </h2>
                <p className="text-dark-500 mb-8">
                  Bei Fragen zur Fahrzeuganmeldung sind wir für Sie erreichbar.
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
                    href={`mailto:${siteConfig.company.email}`}
                    className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white border border-dark-100 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="font-semibold text-dark-800 text-sm">E-Mail</span>
                    <span className="text-xs text-dark-400">{siteConfig.company.email}</span>
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
                  <div className="space-y-3">
                    {faq.map((item, i) => (
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
                Jetzt Auto online anmelden
              </h2>
              <p className="text-dark-300 mb-8 max-w-xl mx-auto">
                Neuzulassung, Ummeldung oder Wiederzulassung – 100% digital und
                offiziell über das i-Kfz Portal des KBA.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="#top" className="btn-primary py-3 px-8">
                  Jetzt Anmelden – ab 99,70 €
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
