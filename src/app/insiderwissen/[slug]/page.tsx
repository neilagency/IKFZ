import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import prisma, { getPostBySlug, getActiveProducts, stripHtml } from '@/lib/db';
import { sanitizeBlogHtml, sanitizeForSchema } from '@/lib/sanitize';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Phone, Calendar, User, ChevronRight, MessageCircle, Share2, Shield, FileCheck } from 'lucide-react';
import { siteConfig } from '@/lib/config';

const SITE_URL = 'https://ikfzdigitalzulassung.de';

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'publish' },
      select: { slug: true },
    });
    return posts.map(p => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post || post.status !== 'publish') {
    return { title: 'Artikel nicht gefunden' };
  }

  const canonical = `${SITE_URL}/insiderwissen/${post.slug}/`;
  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || '';
  const ogImage = post.ogImage || post.featuredImage || `${SITE_URL}/uploads/2024/11/cropped-ikfz-logo-08.png`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: post.robots || 'index, follow',
    openGraph: {
      title: post.ogTitle || title,
      description: post.ogDescription || description,
      url: canonical,
      siteName: 'ikfzdigitalzulassung.de',
      locale: 'de_DE',
      type: 'article',
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.ogTitle || title,
      description: post.ogDescription || description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function InsiderwissenArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await getPostBySlug(slug);
  if (!post || post.status !== 'publish') {
    notFound();
  }

  const products = await getActiveProducts();

  const wordCount = stripHtml(post.content).split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Inject heading IDs and extract TOC
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let processedContent = post.content;
  const matches = Array.from(post.content.matchAll(headingRegex));

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
  const anmeldungPrice = anmeldungProduct ? `ab ${anmeldungProduct.price.toFixed(2).replace('.', ',')} €` : 'ab 99,70 €';

  const postUrl = `${SITE_URL}/insiderwissen/${post.slug}/`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(post.title + ' ' + postUrl)}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;

  // JSON-LD
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { '@type': 'Organization', name: siteConfig.company.name },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.company.name,
      logo: { '@type': 'ImageObject', url: siteConfig.ogImage },
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

      {/* HERO (dark) */}
      <section className="relative overflow-hidden bg-dark-950">
        {post.featuredImage && (
          <div className="absolute inset-0">
            <Image src={post.featuredImage} alt="" fill className="object-cover opacity-10" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-b from-dark-950/80 via-dark-950/70 to-dark-950" />
          </div>
        )}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="pt-32 pb-20 md:pt-44 md:pb-28 relative z-10">
          <div className="container-main max-w-5xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-white/35 mb-6 flex-wrap">
              <Link href="/" className="hover:text-primary transition-colors">Start</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/insiderwissen/" className="hover:text-primary transition-colors">Insiderwissen</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/50 truncate max-w-[200px]">{post.title}</span>
            </nav>

            {/* Category badge */}
            {post.category && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-semibold mb-5 tracking-wide uppercase">
                {post.category}
              </span>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-[2.9rem] font-extrabold text-white mb-6 leading-[1.18] max-w-3xl tracking-tight">
              {post.title}
            </h1>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-5 text-white/40 text-sm">
              <span className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-white/60 font-medium">{post.author || 'iKFZ-Team'}</span>
              </span>
              {dateStr && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {dateStr}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> {readingTime} Min. Lesezeit
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* BODY (light) */}
      <div className="bg-gray-50 min-h-screen">
        <div className="container-main max-w-7xl py-12 md:py-16">
          <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-start">

            {/* MAIN ARTICLE */}
            <article className="flex-1 min-w-0">

              {/* Featured Image */}
              {post.featuredImage && (
                <div className="aspect-[16/7] relative rounded-3xl overflow-hidden mb-0 shadow-xl border border-dark-100">
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

              {/* White article card */}
              <div className={`bg-white border border-dark-100 shadow-card rounded-3xl px-6 py-8 md:px-10 md:py-10 ${post.featuredImage ? '-mt-8 relative z-10 mx-4 md:mx-8' : ''}`}>

                {/* Article prose */}
                <div
                  className="blog-content prose prose-lg max-w-none
                    prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-dark-900
                    prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-3 prose-h2:border-b prose-h2:border-dark-100
                    prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-dark-800
                    prose-p:text-dark-600 prose-p:leading-[1.85] prose-p:text-[1.05rem]
                    prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-dark-900 prose-strong:font-bold
                    prose-blockquote:not-italic prose-blockquote:border-l-4 prose-blockquote:border-primary
                      prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-2xl
                      prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:text-dark-700 prose-blockquote:font-medium
                    prose-code:text-primary prose-code:bg-primary/8 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
                    prose-pre:bg-dark-900 prose-pre:rounded-2xl
                    prose-img:rounded-2xl prose-img:shadow-md prose-img:border prose-img:border-dark-100 prose-img:mx-auto
                    prose-li:text-dark-600 prose-li:leading-relaxed
                    prose-ul:space-y-1 prose-ol:space-y-1
                    [&_ul>li]:marker:text-primary [&_ol>li]:marker:text-primary
                    [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />

                {/* Tags */}
                {post.tags && (
                  <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-dark-100">
                    {post.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((tag: string) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 text-dark-500 text-xs font-medium border border-dark-100">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Share bar */}
                <div className="flex flex-wrap items-center gap-3 mt-8 pt-6 border-t border-dark-100">
                  <span className="text-dark-400 text-sm font-semibold mr-1">Artikel teilen:</span>
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/10 text-[#16a34a] border border-[#25D366]/30 hover:bg-[#25D366]/20 text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a
                    href={facebookShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 hover:bg-[#1877F2]/20 text-sm font-medium transition-colors"
                  >
                    <Share2 className="w-4 h-4" /> Facebook
                  </a>
                </div>
              </div>

              {/* Bottom CTA Banner */}
              <div className="mt-8 rounded-3xl overflow-hidden bg-dark-950 border border-white/[0.06] relative">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,168,90,0.18)_0%,transparent_60%)]" />
                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Ohne Warteschlange</p>
                    <h2 className="text-xl md:text-2xl font-extrabold text-white mb-2 leading-snug">
                      Fahrzeug jetzt online ab- oder anmelden
                    </h2>
                    <p className="text-white/50 text-sm">Kein Termin, kein Behördengang – in wenigen Minuten erledigt.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                    <Link href="/product/fahrzeugabmeldung/" className="btn-primary whitespace-nowrap">
                      Abmelden – {abmeldungPrice}
                    </Link>
                    <Link
                      href="/product/auto-online-anmelden/"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-white/20 text-white/80 text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
                    >
                      Anmelden – {anmeldungPrice}
                    </Link>
                  </div>
                </div>
              </div>
            </article>

            {/* SIDEBAR */}
            <aside className="lg:w-[300px] xl:w-[320px] flex-shrink-0 w-full">
              <div className="sticky top-24 space-y-5">

                {/* Service CTA */}
                <div className="rounded-2xl overflow-hidden border border-dark-100 shadow-card">
                  <div className="bg-dark-950 px-5 py-4">
                    <p className="text-primary text-[10px] font-bold uppercase tracking-widest mb-0.5">Jetzt buchen</p>
                    <h3 className="text-white font-bold text-base">Unsere Services</h3>
                  </div>
                  <div className="bg-white px-5 py-5 space-y-3">
                    <Link
                      href="/product/fahrzeugabmeldung/"
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-700 transition-colors shadow-button"
                    >
                      <span>Fahrzeug Abmelden</span>
                      <span className="text-white/80">{abmeldungPrice}</span>
                    </Link>
                    <Link
                      href="/product/auto-online-anmelden/"
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-primary/20 text-primary font-semibold text-sm hover:bg-primary/5 hover:border-primary/40 transition-colors"
                    >
                      <span>Fahrzeug Anmelden</span>
                      <span>{anmeldungPrice}</span>
                    </Link>
                  </div>
                </div>

                {/* Table of Contents */}
                {headings.length > 2 && (
                  <div className="bg-white rounded-2xl border border-dark-100 shadow-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-dark-100 flex items-center gap-2">
                      <div className="w-1 h-5 rounded-full bg-primary" />
                      <h3 className="text-dark-900 font-bold text-sm">Inhaltsverzeichnis</h3>
                    </div>
                    <nav className="px-5 py-4 space-y-1 max-h-72 overflow-y-auto">
                      {headings.map((h, i) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={`group flex items-center gap-2.5 py-1.5 text-sm transition-colors hover:text-primary ${
                            h.level === 3 ? 'pl-5 text-dark-400' : 'text-dark-600 font-medium'
                          }`}
                        >
                          {h.level === 2 && (
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                              {i + 1}
                            </span>
                          )}
                          {h.level === 3 && <span className="w-1.5 h-1.5 rounded-full bg-dark-300 flex-shrink-0 group-hover:bg-primary transition-colors" />}
                          <span className="truncate">{h.text}</span>
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {/* Help / Contact */}
                <div className="bg-white rounded-2xl border border-dark-100 shadow-card p-5">
                  <h3 className="text-dark-900 font-bold text-sm mb-4">Brauchen Sie Hilfe?</h3>
                  <div className="space-y-3">
                    <a
                      href={`tel:${siteConfig.company.phone}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-dark-100 text-dark-700 hover:border-primary/30 hover:text-primary text-sm font-medium transition-colors"
                    >
                      <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                      {siteConfig.company.phone}
                    </a>
                    <a
                      href={siteConfig.links.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#25D366]/8 border border-[#25D366]/20 text-[#16a34a] hover:bg-[#25D366]/15 text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      WhatsApp Support
                    </a>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="bg-white rounded-2xl border border-dark-100 shadow-card px-5 py-4">
                  <div className="divide-y divide-dark-50">
                    {[
                      { icon: Shield, label: 'KBA-registriert', sub: 'Offiziell zugelassen' },
                      { icon: Clock, label: '24/7 verfügbar', sub: 'Auch am Wochenende' },
                      { icon: FileCheck, label: 'Sofort-Bestätigung', sub: '10 Tage gültig' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="flex items-center gap-3 py-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="text-dark-800 text-sm font-semibold">{label}</div>
                          <div className="text-dark-400 text-xs">{sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
