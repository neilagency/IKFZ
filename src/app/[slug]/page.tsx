import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma, { buildSEOMetadata, getPostBySlug, stripHtml, getActiveProducts } from '@/lib/db';
import { getPageSEO } from '@/lib/seo';
import { sanitizeHtml, sanitizeBlogHtml, sanitizeForSchema } from '@/lib/sanitize';
import WPContentRenderer from '@/components/WPContentRenderer';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { ArrowRight, MapPin, Shield, FileCheck, Clock, Phone, Calendar, User, ChevronRight, MessageCircle, Share2 } from 'lucide-react';
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

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  const [pages, posts] = await Promise.all([
    prisma.page.findMany({
      where: { status: 'published' },
      select: { slug: true },
    }),
    prisma.blogPost.findMany({
      where: { status: 'publish' },
      select: { slug: true },
    }),
  ]);
  const all = [
    ...pages.map(p => ({ slug: p.slug })),
    ...posts.map(p => ({ slug: p.slug })),
  ];
  return all.filter(p => !RESERVED_SLUGS.has(p.slug));
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

  // Check blog posts
  const post = await getPostBySlug(slug);
  if (post) return buildSEOMetadata(post);

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

  // Check for blog post
  const post = await getPostBySlug(slug);
  if (post && post.status === 'publish') {
    const products = await getActiveProducts();
    return <BlogPostView post={post} products={products} />;
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

// ═══════════════════════════════════════════════════════════
// BLOG POST VIEW
// ═══════════════════════════════════════════════════════════
function BlogPostView({ post, products }: { post: any; products: any[] }) {
  const wordCount = stripHtml(post.content).split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Inject heading IDs and extract TOC
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let processedContent = post.content;
  const matches = [...post.content.matchAll(headingRegex)];

  for (const match of matches) {
    const level = parseInt(match[1]);
    const text = sanitizeForSchema(match[2]);
    const id = text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    headings.push({ level, text, id });
    processedContent = processedContent.replace(
      match[0],
      `<h${level} id="${id}">${match[2]}</h${level}>`
    );
  }

  const sanitizedContent = sanitizeBlogHtml(processedContent);
  const dateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const abmeldungProduct = products.find(p => p.serviceType === 'abmeldung');
  const anmeldungProduct = products.find(p => p.serviceType === 'anmeldung');
  const abmeldungPrice = abmeldungProduct ? `${abmeldungProduct.price.toFixed(2).replace('.', ',')} €` : '19,70 €';
  const anmeldungPrice = anmeldungProduct ? `ab ${abmeldungProduct.price.toFixed(2).replace('.', ',')} €` : 'ab 99,70 €';

  const postUrl = `${SITE_URL}/${post.slug}/`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' ' + postUrl)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;

  // JSON-LD
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { '@type': 'Organization', name: 'Online Auto Abmelden' },
    publisher: {
      '@type': 'Organization',
      name: 'Online Auto Abmelden',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.webp` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    ...(post.featuredImage ? { image: post.featuredImage } : {}),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Start', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Insiderwissen', item: `${SITE_URL}/insiderwissen/` },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-dark via-primary-900 to-dark">
        <div className="pt-32 pb-16 md:pt-40 md:pb-20 relative">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="container-main relative z-10">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-white/40 mb-6">
              <Link href="/" className="hover:text-primary transition-colors">Start</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <Link href="/insiderwissen/" className="hover:text-primary transition-colors">Insiderwissen</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white/60 truncate max-w-xs">{post.title}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight max-w-4xl">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-white/40 text-sm mb-8">
              {dateStr && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {dateStr}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {readingTime} Min. Lesezeit
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/product/fahrzeugabmeldung/" className="btn-primary">
                Fahrzeug Abmelden – {abmeldungPrice}
              </Link>
              <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline-white">
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Content Area — Two Column (LIGHT) */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-main">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              {/* Featured Image */}
              {post.featuredImage && (
                <div className="aspect-[2/1] relative rounded-2xl overflow-hidden mb-10 border border-dark-100 shadow-sm">
                  <Image
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                  />
                </div>
              )}

              {/* Blog Content */}
              <div
                className="prose prose-lg max-w-2xl
                  prose-headings:text-dark-900 prose-headings:font-bold
                  prose-p:text-dark-600 prose-p:leading-relaxed
                  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-dark-900
                  prose-blockquote:border-primary prose-blockquote:text-dark-500 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-xl
                  prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                  prose-img:rounded-xl prose-img:border prose-img:border-dark-100 prose-img:shadow-sm
                  prose-li:text-dark-600
                  prose-ul:marker:text-primary prose-ol:marker:text-primary"
                dangerouslySetInnerHTML={{ __html: sanitizedContent }}
              />

              {/* Share */}
              <div className="flex items-center gap-4 mt-12 pt-8 border-t border-dark-100">
                <span className="text-dark-400 text-sm font-medium">Teilen:</span>
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
                <a
                  href={facebookShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Facebook
                </a>
              </div>

              {/* Big CTA */}
              <div className="mt-12 p-8 rounded-2xl bg-white border border-dark-100 shadow-sm">
                <h2 className="text-2xl font-bold text-dark-900 mb-3">Jetzt Fahrzeug online abmelden oder anmelden</h2>
                <p className="text-dark-500 mb-6">Sparen Sie sich den Weg zur Zulassungsstelle. Erledigen Sie alles bequem von zu Hause.</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/product/fahrzeugabmeldung/" className="btn-primary">
                    Abmelden – {abmeldungPrice}
                  </Link>
                  <Link href="/product/auto-online-anmelden/" className="px-6 py-3 rounded-xl border border-primary/30 text-primary font-medium hover:bg-primary/10 transition-colors">
                    Anmelden – {anmeldungPrice}
                  </Link>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:w-80 xl:w-[340px] flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* CTA Card */}
                <div className="p-6 rounded-2xl bg-white border border-dark-100 shadow-sm">
                  <h3 className="text-dark-900 font-bold mb-4">Unsere Services</h3>
                  <div className="space-y-3">
                    <Link href="/product/fahrzeugabmeldung/" className="block px-4 py-3 rounded-xl bg-primary text-white text-center font-medium hover:bg-primary/90 transition-colors text-sm">
                      Abmelden – {abmeldungPrice}
                    </Link>
                    <Link href="/product/auto-online-anmelden/" className="block px-4 py-3 rounded-xl border border-primary/30 text-primary text-center font-medium hover:bg-primary/10 transition-colors text-sm">
                      Anmelden – {anmeldungPrice}
                    </Link>
                  </div>
                </div>

                {/* Table of Contents */}
                {headings.length > 2 && (
                  <div className="p-6 rounded-2xl bg-white border border-dark-100 shadow-sm">
                    <h3 className="text-dark-900 font-bold text-sm mb-4">Inhaltsverzeichnis</h3>
                    <nav className="space-y-2 max-h-80 overflow-y-auto">
                      {headings.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={`block text-sm text-dark-400 hover:text-primary transition-colors ${
                            h.level === 3 ? 'pl-4' : ''
                          }`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {/* Help Card */}
                <div className="p-6 rounded-2xl bg-white border border-dark-100 shadow-sm">
                  <h3 className="text-dark-900 font-bold text-sm mb-4">Brauchen Sie Hilfe?</h3>
                  <div className="space-y-3">
                    <a href={`tel:${siteConfig.company.phone}`} className="flex items-center gap-3 text-dark-500 hover:text-primary text-sm transition-colors">
                      <Phone className="w-4 h-4 text-primary" /> {siteConfig.company.phone}
                    </a>
                    <a href={siteConfig.links.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-dark-500 hover:text-primary text-sm transition-colors">
                      <MessageCircle className="w-4 h-4 text-green-500" /> WhatsApp Support
                    </a>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="p-6 rounded-2xl bg-white border border-dark-100 shadow-sm">
                  <div className="space-y-3">
                    {[
                      { icon: Shield, text: 'KBA-registriert' },
                      { icon: Clock, text: '24/7 verfügbar' },
                      { icon: FileCheck, text: 'Sofort-Bestätigung' },
                    ].map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-center gap-3 text-sm text-dark-500">
                        <Icon className="w-4 h-4 text-primary" /> {text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
