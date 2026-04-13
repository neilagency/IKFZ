import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import prisma, { getPostBySlug } from '@/lib/db';
import { getPageSEO } from '@/lib/seo';
import { sanitizeWPContent } from '@/lib/wordpress';
import WPContentRenderer from '@/components/WPContentRenderer';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { ArrowRight, MapPin, Phone, ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';
import {
  CityHero, CityStatsBar, CitySteps, CityServices,
  CityCTA, CityContent,
} from '@/components/city/CityComponents';

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
      <CityHero
        badge={`KFZ Zulassung in ${cityName}`}
        h1Parts={['KFZ online zulassen', `in ${cityName}`]}
        subtitle={`Kein Besuch bei der Zulassungsstelle ${cityName} nötig. Alle Fahrzeugtypen – PKW, Motorrad, Anhänger. Offiziell beim KBA registriert.`}
      />

      <CityStatsBar
        items={[
          { icon: 'Shield', label: 'KBA registriert', desc: 'Offiziell beim Kraftfahrt-Bundesamt' },
          { icon: 'FileCheck', label: 'Sofort-Bestätigung', desc: '10 Tage gültige Bestätigung' },
          { icon: 'Clock', label: '24/7 verfügbar', desc: 'Auch am Wochenende' },
          { icon: 'MapPin', label: cityName, desc: 'Lokaler Service verfügbar' },
        ]}
      />

      <CitySteps
        title={`Online-Zulassung in ${cityName}`}
        subtitle="In nur 3 einfachen Schritten zur Zulassung – ohne Wartezeit, ohne Behördengang."
        steps={[
          { num: '1', title: 'Antrag online ausfüllen', desc: 'Geben Sie Ihre Fahrzeug- und Halterdaten in unser Formular ein – dauert nur wenige Minuten.' },
          { num: '2', title: 'Dokumente hochladen', desc: 'Laden Sie Fahrzeugschein, Personalausweis und ggf. eVB-Nummer bequem hoch.' },
          { num: '3', title: 'Bestätigung erhalten', desc: 'Nach Prüfung erhalten Sie Ihre Zulassungsbestätigung direkt per E-Mail.' },
        ]}
      />

      <CityContent
        title={title}
        content={content}
        featuredImage={featuredImage}
      />

      <CityServices
        title={`Alle Services für ${cityName}`}
        services={[
          { label: 'Auto online anmelden', href: '/product/auto-online-anmelden/', desc: 'PKW-Neuzulassung oder Ummeldung' },
          { label: 'KFZ online abmelden', href: '/product/fahrzeugabmeldung/', desc: 'Schnelle Außerbetriebsetzung' },
          { label: 'Motorrad anmelden', href: '/motorrad-online-anmelden/', desc: 'Motorrad-Zulassung online' },
          { label: 'eVB-Nummer anfordern', href: '/evb/', desc: 'Kostenlose Versicherungsbestätigung' },
          { label: 'Versicherung berechnen', href: '/kfz-versicherung-berechnen/', desc: 'Günstige Tarife vergleichen' },
          { label: 'Alle Städte anzeigen', href: '/kfz-zulassung-in-deiner-stadt/', desc: 'Alle Standorte im Überblick' },
        ]}
      />

      <CityCTA
        title={`Bereit für Ihre Online-Zulassung in`}
        highlight={`${cityName}?`}
        subtitle="Starten Sie jetzt und sparen Sie sich den Weg zur Zulassungsstelle."
        secondaryCta={{ label: 'eVB-Nummer anfordern', href: '/evb/' }}
      />
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
              {featuredImage && (<div className="mb-12 rounded-2xl overflow-hidden border border-dark-100 shadow-sm"><Image src={featuredImage} alt={title} width={896} height={504} sizes="(max-width: 768px) 100vw, 896px" className="w-full h-auto" loading="lazy" /></div>)}
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
                  <Image src={featuredImage} alt={title} width={896} height={504} sizes="(max-width: 768px) 100vw, 896px" className="w-full h-auto" loading="lazy" />
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
