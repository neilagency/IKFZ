import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import ScrollReveal from '@/components/ScrollReveal';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, User, ArrowLeft, Tag, BookOpen, ChevronRight } from 'lucide-react';
import { siteConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://ikfzdigitalzulassung.de';
const DEFAULT_OG_IMAGE = `${SITE_URL}/uploads/2024/11/cropped-ikfz-logo-08.png`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { seo: true },
  });

  if (!post || post.status !== 'published') {
    return { title: 'Beitrag nicht gefunden' };
  }

  const seo = post.seo;
  return {
    title: seo?.metaTitle || post.title,
    description: seo?.metaDescription || post.excerpt || undefined,
    alternates: {
      canonical: seo?.canonicalUrl || `${SITE_URL}/blog/${slug}/`,
    },
    openGraph: {
      title: seo?.ogTitle || seo?.metaTitle || post.title,
      description: seo?.ogDescription || seo?.metaDescription || post.excerpt || undefined,
      url: `${SITE_URL}/blog/${slug}/`,
      siteName: 'ikfzdigitalzulassung.de',
      locale: 'de_DE',
      type: 'article',
      images: seo?.ogImage ? [{ url: seo.ogImage }] : post.featuredImage ? [{ url: post.featuredImage }] : [{ url: DEFAULT_OG_IMAGE }],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo?.twitterTitle || seo?.metaTitle || post.title,
      description: seo?.twitterDesc || seo?.metaDescription || post.excerpt || undefined,
      images: seo?.twitterImage ? [seo.twitterImage] : seo?.ogImage ? [seo.ogImage] : post.featuredImage ? [post.featuredImage] : undefined,
    },
    robots: seo?.robots || undefined,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      seo: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!post || post.status !== 'published') {
    notFound();
  }

  // Fetch related posts (same category, excluding current)
  const categoryIds = post.categories.map(c => c.categoryId);
  const relatedPosts = categoryIds.length > 0
    ? await prisma.post.findMany({
        where: {
          status: 'published',
          id: { not: post.id },
          categories: { some: { categoryId: { in: categoryIds } } },
        },
        take: 3,
        orderBy: { publishedAt: 'desc' },
        include: { categories: { include: { category: true } } },
      })
    : [];

  const schemaJson = post.seo?.schemaJson || JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || '',
    image: post.featuredImage || DEFAULT_OG_IMAGE,
    author: { '@type': 'Organization', name: post.author || siteConfig.company.name },
    publisher: { '@type': 'Organization', name: siteConfig.company.name },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/blog/${slug}/` },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: schemaJson }} />

      {/* ── Dark Hero ── */}
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-24 md:pt-40 md:pb-32 relative">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="container-main relative z-10 max-w-4xl mx-auto">
            <ScrollReveal>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-white/40 mb-8">
                <Link href="/" className="hover:text-white/60 transition-colors">Startseite</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href="/blog" className="hover:text-white/60 transition-colors">Blog</Link>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-white/60 truncate max-w-[200px]">{post.title}</span>
              </nav>

              {/* Categories */}
              {post.categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {post.categories.map(c => (
                    <Link
                      key={c.categoryId}
                      href={`/blog?category=${c.category.slug}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase hover:bg-primary/20 transition-colors"
                    >
                      {c.category.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold text-white mb-6 leading-[1.15] tracking-tight">
                {post.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-5 text-sm">
                {post.author && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-white font-medium text-sm">{post.author}</span>
                    </div>
                  </div>
                )}
                {post.author && (post.publishedAt || post.readingTime) && (
                  <div className="w-px h-5 bg-white/10" />
                )}
                {post.publishedAt && (
                  <span className="flex items-center gap-1.5 text-white/50">
                    <Calendar className="w-4 h-4 text-white/30" />
                    {new Date(post.publishedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                )}
                {post.readingTime && (
                  <span className="flex items-center gap-1.5 text-white/50">
                    <Clock className="w-4 h-4 text-white/30" />
                    {post.readingTime} Min. Lesezeit
                  </span>
                )}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Light Content Area ── */}
      <section className="bg-white relative">
        {/* Featured Image — overlaps hero */}
        {post.featuredImage && (
          <div className="container-main relative z-10 max-w-4xl mx-auto -mt-16 md:-mt-20">
            <ScrollReveal>
              <div className="rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-dark-100/60">
                <img src={post.featuredImage} alt={post.title} className="w-full h-auto" loading="lazy" />
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* Article Content */}
        <div className="container-main max-w-4xl mx-auto">
          <ScrollReveal>
            <article className={`${post.featuredImage ? 'pt-12 md:pt-16' : 'pt-16 md:pt-24'} pb-12`}>
              <div
                className="wp-content prose prose-lg max-w-none
                  prose-headings:text-dark-900 prose-headings:font-bold prose-headings:tracking-tight
                  prose-h2:text-2xl prose-h2:md:text-3xl prose-h2:mt-12 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-dark-100
                  prose-h3:text-xl prose-h3:md:text-2xl prose-h3:mt-10 prose-h3:mb-4
                  prose-p:text-dark-600 prose-p:leading-[1.85] prose-p:mb-5
                  prose-strong:text-dark-800 prose-strong:font-semibold
                  prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline
                  prose-li:text-dark-600 prose-li:leading-[1.8]
                  prose-ul:my-5 prose-ol:my-5
                  prose-blockquote:border-l-primary prose-blockquote:bg-primary/[0.03] prose-blockquote:rounded-r-xl prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-dark-700
                  prose-img:rounded-xl prose-img:shadow-md prose-img:border prose-img:border-dark-100
                  prose-code:bg-dark-50 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-medium
                  prose-pre:bg-dark-900 prose-pre:text-white prose-pre:rounded-2xl prose-pre:shadow-lg
                  prose-table:border prose-table:border-dark-100 prose-th:bg-dark-50 prose-th:text-dark-800 prose-td:border prose-td:border-dark-100"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </article>
          </ScrollReveal>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="pb-12 border-t border-dark-100 pt-8">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-dark-300" />
                {post.tags.map(t => (
                  <span key={t.tagId} className="px-3 py-1.5 rounded-full bg-dark-50 border border-dark-100 text-dark-500 text-xs font-medium">
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Author Card */}
          {post.author && (
            <div className="pb-16">
              <div className="rounded-2xl bg-gradient-to-br from-dark-50 to-white border border-dark-100 p-6 md:p-8 flex items-center gap-5">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-1">Geschrieben von</p>
                  <p className="text-lg font-bold text-dark-900">{post.author}</p>
                  <p className="text-sm text-dark-500 mt-0.5">{siteConfig.company.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Related Posts (Light background) ── */}
      {relatedPosts.length > 0 && (
        <section className="py-16 md:py-20 bg-dark-50/50 border-t border-dark-100">
          <div className="container-main">
            <ScrollReveal>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <div className="section-label mb-3">
                    <BookOpen className="w-3.5 h-3.5" /> Weiterlesen
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-dark-900">Ähnliche Beiträge</h2>
                </div>
                <Link href="/blog" className="hidden md:flex items-center gap-1.5 text-primary font-semibold text-sm hover:gap-2.5 transition-all">
                  Alle Beiträge <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </ScrollReveal>
            <div className="grid gap-8 md:grid-cols-3">
              {relatedPosts.map((rp, i) => {
                const cat = rp.categories?.[0]?.category?.name;
                return (
                  <ScrollReveal key={rp.id} delay={i * 0.08}>
                    <Link href={`/blog/${rp.slug}`} className="group block h-full">
                      <article className="h-full rounded-2xl bg-white border border-dark-100/60 overflow-hidden shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
                        {rp.featuredImage && (
                          <div className="aspect-video overflow-hidden">
                            <img src={rp.featuredImage} alt={rp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                          </div>
                        )}
                        <div className="p-5 md:p-6">
                          {cat && (
                            <span className="inline-block px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/15 text-primary text-xs font-semibold mb-3">{cat}</span>
                          )}
                          <h3 className="text-base font-bold text-dark-900 line-clamp-2 group-hover:text-primary transition-colors leading-snug">{rp.title}</h3>
                          {rp.publishedAt && (
                            <p className="text-xs text-dark-400 mt-3 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(rp.publishedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </article>
                    </Link>
                  </ScrollReveal>
                );
              })}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link href="/blog" className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm">
                Alle Beiträge anzeigen <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section (Dark) ── */}
      <section className="relative bg-dark-950 py-20 md:py-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="container-main text-center relative z-10">
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm text-sm text-white/70 mb-6">
              <ArrowRight className="w-4 h-4 text-primary" />
              Jetzt starten
            </div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">Fahrzeug online zulassen oder abmelden?</h2>
            <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">Schnell, einfach und ohne Behördengang. Starten Sie jetzt!</p>
            <Link href="/kfz-service/kfz-online-service/" className="btn-primary text-lg">
              Jetzt online starten <ArrowRight className="w-5 h-5" />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
