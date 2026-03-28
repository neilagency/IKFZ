import type { Metadata } from 'next';
import { notFound, redirect, permanentRedirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getPageSEO } from '@/lib/seo';
import WPContentRenderer from '@/components/WPContentRenderer';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, MapPin, Shield, FileCheck, Clock, Phone, Calendar, User } from 'lucide-react';
import { siteConfig } from '@/lib/config';

const STATIC_SLUGS = new Set([
  'starseite-2', 'startseite', 'impressum', 'datenschutzerklarung',
  'agb', 'faq', 'kfz-services', 'kfz-service', 'kfz-online-service', 'evb',
  'antragsuebersicht', 'warenkorb', 'mein-konto', 'kasse',
  'auto-verkaufen', 'kfz-versicherung-berechnen',
  'motorrad-online-anmelden', 'auto-online-anmelden', 'kfz-online-abmelden',
  'kfz-zulassung-in-deiner-stadt',
]);

export async function generateStaticParams() {
  const pages = await prisma.page.findMany({
    where: { status: 'published' },
    select: { slug: true },
  });
  return pages.filter(p => !STATIC_SLUGS.has(p.slug)).map(p => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug } });
  if (page) return getPageSEO(slug);
  // Check if it's a blog post and redirect
  const post = await prisma.post.findUnique({ where: { slug } });
  if (post) return { title: post.title };
  return { title: 'Seite nicht gefunden' };
}

function isCitySlug(slug: string): boolean {
  const cityPatterns = ['kfz-zulassung-', 'zulassungsstelle-', 'autoanmeldung-', 'auto-anmelden-', 'kfz-zulassung-in-'];
  return cityPatterns.some(p => slug.startsWith(p));
}

function extractCityName(title: string): string {
  const patterns = [/kfz[- ]zulassung[- ](?:in[- ])?(.+)/i, /zulassungsstelle[- ](.+)/i, /autoanmeldung[- ](.+)/i, /auto[- ]anmelden[- ](?:in[- ])?(.+)/i];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  return title;
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const page = await prisma.page.findUnique({ where: { slug }, include: { seo: true } });
  if (page) {
    const schemaJson = page.seo?.schemaJson;
    const isCity = isCitySlug(slug) || page.pageType === 'city';
    const cityName = isCity ? extractCityName(page.title) : null;
    if (isCity && cityName) {
      return (<>{schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}<CityLandingPage cityName={cityName} title={page.title} content={page.content} featuredImage={page.featuredImage} /></>);
    }
    if (page.pageType === 'service') {
      return (<>{schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}<ServicePage slug={slug} title={page.title} content={page.content} featuredImage={page.featuredImage} /></>);
    }
    return (<>{schemaJson && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />}<GenericPage title={page.title} content={page.content} featuredImage={page.featuredImage} /></>);
  }

  const post = await prisma.post.findUnique({ where: { slug }, include: { seo: true, categories: { include: { category: true } } } });
  if (post) {
    // Redirect blog posts to /blog/{slug} for URL consolidation (permanent 308)
    permanentRedirect(`/blog/${slug}`);
  }

  notFound();
}


// City Landing Page
function CityLandingPage({ cityName, title, content, featuredImage }: { cityName: string; title: string; content: string; featuredImage: string | null }) {
  return (
    <>
      {/* Dark Hero */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-24 relative">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main relative z-10">
            <ScrollReveal>
              <div className="flex items-center gap-2 text-white/50 text-sm font-medium mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                KFZ Zulassung in {cityName}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
                Auto online anmelden<br />
                <span className="text-primary">in {cityName}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-8">
                Kein Besuch bei der Zulassungsstelle nötig. Alle Fahrzeugtypen möglich. Offiziell beim KBA registriert.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">Jetzt online starten <ArrowRight className="w-5 h-5" /></Link>
                <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline-white"><Phone className="w-5 h-5" /> WhatsApp Support</a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Light Stats Bar */}
      <section className="py-10 bg-gray-50 border-b border-dark-100">
        <div className="container-main">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: 'KBA registriert', desc: 'Offiziell beim Kraftfahrt-Bundesamt' },
              { icon: FileCheck, label: 'Sofort-PDF', desc: '10 Tage gültige Bestätigung' },
              { icon: Clock, label: '24/7 verfügbar', desc: 'Auch am Wochenende' },
              { icon: MapPin, label: cityName, desc: 'Deutschlandweit verfügbar' },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 0.1}>
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

      {/* Light Content */}
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

      {/* Dark CTA */}
      <section className="relative bg-dark-950 py-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main text-center relative z-10">
          <ScrollReveal>
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Bereit für Ihre Online-Zulassung in <span className="text-primary">{cityName}</span>?</h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">Starten Sie jetzt und sparen Sie sich den Weg zur Zulassungsstelle.</p>
            <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">Jetzt Fahrzeug anmelden <ArrowRight className="w-5 h-5" /></Link>
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
