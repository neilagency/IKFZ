import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import prisma, { getPostBySlug } from '@/lib/db';
import { getPageSEO } from '@/lib/seo';
import { sanitizeWPContent } from '@/lib/wordpress';
import WPContentRenderer from '@/components/WPContentRenderer';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, MapPin, Shield, FileCheck, Clock, Phone, ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';

const SITE_URL = 'https://ikfzdigitalzulassung.de';

const RESERVED_SLUGS = new Set([
  'insiderwissen', 'rechnung', 'admin', 'product', 'api',
  'starseite-2', 'startseite', 'impressum', 'datenschutzerklarung',
  'agb', 'faq', 'kfz-services', 'kfz-service', 'kfz-online-service', 'evb',
  'antragsuebersicht', 'warenkorb', 'mein-konto', 'kasse',
  'auto-verkaufen', 'kfz-versicherung-berechnen',
  'motorrad-online-anmelden', 'auto-online-anmelden', 'kfz-online-abmelden',
  'kfz-zulassung-in-deiner-stadt', 'bestellung-erfolgreich', 'zahlung-fehlgeschlagen',
]);

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const pages = await prisma.page.findMany({
      where: { status: 'published' },
      select: { slug: true },
    });
    return pages.map(p => ({ slug: p.slug })).filter(p => !RESERVED_SLUGS.has(p.slug));
  } catch (e) {
    console.warn('[slug] generateStaticParams failed (DB not available at build time):', (e as Error).message);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Check pages first
  const page = await prisma.page.findUnique({ where: { slug } });
  if (page) return getPageSEO(slug);

  // Blog posts now live at /insiderwissen/{slug}/ — no metadata needed here
  return { title: 'Seite nicht gefunden' };
}

function isCitySlug(slug: string): boolean {
  const cityPatterns = ['kfz-zulassung-', 'zulassungsstelle-', 'autoanmeldung-', 'auto-anmelden-', 'kfz-zulassung-in-', 'landkreis-', 'auto-online-anmelden-oder-abmelden-', 'in-'];
  return cityPatterns.some(p => slug.startsWith(p));
}

function extractCityName(title: string): string {
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

function buildPageBreadcrumb(title: string, pageType: string | null) {
  const items: { name: string; item?: string }[] = [
    { name: 'Start', item: SITE_URL },
  ];
  if (pageType === 'city') {
    items.push({ name: 'KFZ Zulassung in deiner Stadt', item: `${SITE_URL}/kfz-zulassung-in-deiner-stadt/` });
  } else if (pageType === 'service') {
    items.push({ name: 'KFZ Dienstleistungen', item: `${SITE_URL}/kfz-services/` });
  }
  items.push({ name: title });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.item ? { item: item.item } : {}),
    })),
  };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({ where: { slug }, include: { seo: true } });
  if (page) {
    const schemaJson = page.seo?.schemaJson;
    const isCity = isCitySlug(slug) || page.pageType === 'city';
    const cityName = isCity ? extractCityName(page.title) : null;
    const breadcrumb = buildPageBreadcrumb(page.title, page.pageType);
    const cleanContent = sanitizeWPContent(page.content);
    if (isCity && cityName) {
      return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />{schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}<CityLandingPage cityName={cityName} title={page.title} content={cleanContent} featuredImage={page.featuredImage} /></>);
    }
    if (page.pageType === 'service') {
      return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />{schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}<ServicePage slug={slug} title={page.title} content={cleanContent} featuredImage={page.featuredImage} /></>);
    }
    return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />{schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}<GenericPage title={page.title} content={cleanContent} featuredImage={page.featuredImage} /></>);
  }

  // Blog posts now live at /insiderwissen/{slug}/ — 301 redirect for SEO
  const post = await getPostBySlug(slug);
  if (post && post.status === 'publish') {
    redirect(`/insiderwissen/${slug}/`);
  }

  notFound();
}


// City Landing Page
function CityLandingPage({ cityName, title, content, featuredImage }: { cityName: string; title: string; content: string; featuredImage: string | null }) {
  return (
    <>
      {/* Dark Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="pt-32 pb-16 md:pt-40 md:pb-24 relative">
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full text-sm font-medium text-primary border border-primary/20 mb-8">
                <MapPin className="w-4 h-4" />
                <span>KFZ Zulassung in {cityName}</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                KFZ online zulassen<br />
                <span className="text-primary">in {cityName}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-8">
                Kein Besuch bei der Zulassungsstelle {cityName} nötig. Alle Fahrzeugtypen – PKW, Motorrad, Anhänger. Offiziell beim KBA registriert.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">Jetzt online starten <ArrowRight className="w-5 h-5" /></Link>
                <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline-white"><Phone className="w-5 h-5" /> WhatsApp Support</a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-10 bg-gray-50 border-b border-dark-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Shield, label: 'KBA registriert', desc: 'Offiziell beim Kraftfahrt-Bundesamt' },
              { icon: FileCheck, label: 'Sofort-Bestätigung', desc: '10 Tage gültige Bestätigung' },
              { icon: Clock, label: '24/7 verfügbar', desc: 'Auch am Wochenende' },
              { icon: MapPin, label: cityName, desc: 'Lokaler Service verfügbar' },
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

      {/* 3-Step Process */}
      <section className="bg-dark-50/50 py-16 md:py-24">
        <div className="container-main">
          <ScrollReveal>
            <div className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">So funktioniert es</span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-dark-900 mb-4">Online-Zulassung in {cityName}</h2>
              <p className="text-dark-400 text-lg max-w-2xl mx-auto">
                In nur 3 einfachen Schritten zur Zulassung – ohne Wartezeit, ohne Behördengang.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { num: '1', title: 'Antrag online ausfüllen', desc: 'Geben Sie Ihre Fahrzeug- und Halterdaten in unser Formular ein – dauert nur wenige Minuten.' },
              { num: '2', title: 'Dokumente hochladen', desc: 'Laden Sie Fahrzeugschein, Personalausweis und ggf. eVB-Nummer bequem hoch.' },
              { num: '3', title: 'Bestätigung erhalten', desc: 'Nach Prüfung erhalten Sie Ihre Zulassungsbestätigung direkt per E-Mail.' },
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

      {/* Content from WP */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white via-gray-50/30 to-white relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,168,90,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,90,0.02)_1px,transparent_1px)] bg-[size:64px_64px] pointer-events-none" />
        <div className="container-main relative z-10">
          <div className="max-w-4xl mx-auto">
            {featuredImage && (
              <ScrollReveal>
                <div className="mb-12 rounded-2xl overflow-hidden border border-dark-100 shadow-sm">
                  <img src={featuredImage} alt={title} className="w-full h-auto" loading="lazy" />
                </div>
              </ScrollReveal>
            )}
            <ScrollReveal>
              <WPContentRenderer html={content} variant="light" />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container-main">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">Unsere Services</span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-dark-900">Alle Services für {cityName}</h2>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { label: 'Auto online anmelden', href: '/product/auto-online-anmelden/', desc: 'PKW-Neuzulassung oder Ummeldung' },
              { label: 'KFZ online abmelden', href: '/product/fahrzeugabmeldung/', desc: 'Schnelle Außerbetriebsetzung' },
              { label: 'Motorrad anmelden', href: '/motorrad-online-anmelden/', desc: 'Motorrad-Zulassung online' },
              { label: 'eVB-Nummer anfordern', href: '/evb/', desc: 'Kostenlose Versicherungsbestätigung' },
              { label: 'Versicherung berechnen', href: '/kfz-versicherung-berechnen/', desc: 'Günstige Tarife vergleichen' },
              { label: 'Alle Städte anzeigen', href: '/kfz-zulassung-in-deiner-stadt/', desc: 'Alle Standorte im Überblick' },
            ].map((svc, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <Link
                  href={svc.href}
                  className="group flex items-center gap-4 rounded-2xl bg-white border border-dark-100 p-5 hover:shadow-card hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-dark-900 text-sm group-hover:text-primary transition-colors">{svc.label}</div>
                    <div className="text-xs text-dark-400">{svc.desc}</div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="relative bg-dark-950 py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main text-center relative z-10">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Bereit für Ihre Online-Zulassung in <span className="text-primary">{cityName}</span>?
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Starten Sie jetzt und sparen Sie sich den Weg zur Zulassungsstelle.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">Jetzt Fahrzeug anmelden <ArrowRight className="w-5 h-5" /></Link>
              <Link href="/evb/" className="btn-outline-white">eVB-Nummer anfordern</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

// Generic Page
function GenericPage({ title, content, featuredImage }: { title: string; content: string; featuredImage: string | null }) {
  return (
    <>
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-24 relative">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main text-center relative z-10">
            <ScrollReveal>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">{title}</h1>
            </ScrollReveal>
          </div>
        </div>
      </section>
      <section className="py-16 md:py-24 bg-white">
        <div className="container-main">
          <ScrollReveal>
            <div className="max-w-4xl mx-auto">
              {featuredImage && (<div className="mb-12 rounded-2xl overflow-hidden border border-dark-100 shadow-sm"><img src={featuredImage} alt={title} className="w-full h-auto" loading="lazy" /></div>)}
              <WPContentRenderer html={content} variant="light" />
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

// Service Page (light mode body with dark hero)
function ServicePage({ slug, title, content, featuredImage }: { slug: string; title: string; content: string; featuredImage: string | null }) {
  // Insurance calculator pages embed external widgets
  const isInsuranceCalc = slug === 'kfz-versicherung-berechnen' || slug === 'motorrad-versicherung-vergleichen';

  return (
    <>
      {/* Dark Hero */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-20 relative">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="flex items-center gap-2 text-white/50 text-sm font-medium mb-4">
                <Link href="/kfz-services/" className="hover:text-primary transition-colors">Dienstleistungen</Link>
                <span>/</span>
                <span className="text-white/70">{title}</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                {title}
              </h1>
              <div className="flex flex-wrap gap-4">
                <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">Jetzt online starten <ArrowRight className="w-5 h-5" /></Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Light Content */}
      <section className="bg-white py-16 md:py-24">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            {featuredImage && (
              <ScrollReveal>
                <div className="mb-12 rounded-2xl overflow-hidden border border-dark-100 shadow-sm">
                  <img src={featuredImage} alt={title} className="w-full h-auto" loading="lazy" />
                </div>
              </ScrollReveal>
            )}
            {isInsuranceCalc ? (
              <InsuranceCalculator slug={slug} />
            ) : (
              <ScrollReveal>
                <WPContentRenderer html={content} variant="light" />
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-dark-950 py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main relative z-10 text-center">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Bereit für Ihren <span className="text-primary">Online-Service</span>?
            </h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
              Starten Sie jetzt und sparen Sie sich den Weg zur Zulassungsstelle.
            </p>
            <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">Jetzt Fahrzeug anmelden <ArrowRight className="w-5 h-5" /></Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}

// Insurance Calculator (external widget embed)
function InsuranceCalculator({ slug }: { slug: string }) {
  const scriptSrc = slug === 'kfz-versicherung-berechnen'
    ? 'https://form.partner-versicherung.de/widgets/184294/tcpp-iframe-kfz/kfz-iframe.js'
    : 'https://form.partner-versicherung.de/widgets/184294/tcpp-iframe-mot/mot-iframe.js';

  const containerId = slug === 'kfz-versicherung-berechnen' ? 'tcpp-iframe-kfz' : 'tcpp-iframe-mot';
  const calcTitle = slug === 'kfz-versicherung-berechnen'
    ? 'KFZ-Versicherung berechnen in 2 Minuten'
    : 'Motorrad-Versicherung berechnen in 2 Minuten';

  return (
    <ScrollReveal>
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-dark-900">{calcTitle}</h2>
      </div>
      <div className="rounded-2xl border border-dark-100 shadow-sm p-4 md:p-8 bg-gray-50">
        <div style={{ width: '100%' }} id={containerId} />
        <Script src={scriptSrc} strategy="afterInteractive" />
      </div>
    </ScrollReveal>
  );
}
