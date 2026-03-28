import prisma from '@/lib/db';
import Link from 'next/link';
import ScrollReveal from '@/components/ScrollReveal';
import { Calendar, Clock, ArrowRight, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | iKFZ Digital Zulassung',
  description: 'Aktuelle Artikel rund um KFZ-Zulassung, Abmeldung, Ummeldung und alles was Sie wissen müssen.',
  alternates: { canonical: 'https://ikfzdigitalzulassung.de/blog/' },
};

const POSTS_PER_PAGE = 9;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }) {
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10));
  const categorySlug = sp.category || undefined;

  const where: any = { status: 'published' };
  if (categorySlug) {
    where.categories = { some: { category: { slug: categorySlug } } };
  }

  const [posts, total, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (currentPage - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
      include: { categories: { include: { category: true } } },
    }),
    prisma.post.count({ where }),
    prisma.category.findMany({
      where: { posts: { some: { post: { status: 'published' } } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  return (
    <>
      <section className="relative overflow-hidden bg-dark-950">
        <div className="pt-32 pb-16 md:pt-40 md:pb-20 relative">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="container-main text-center relative z-10">
            <ScrollReveal>
              <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold uppercase tracking-wider mb-4">
                <BookOpen className="w-4 h-4" /> Blog
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Neues & Aktuelles</h1>
              <p className="text-lg text-white/50 max-w-2xl mx-auto">Aktuelle Artikel rund um KFZ-Zulassung, Abmeldung und Ummeldung</p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      {categories.length > 0 && (
        <section className="bg-dark-950 border-b border-white/[0.06] py-4">
          <div className="container-main">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/blog"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !categorySlug
                    ? 'bg-primary text-white'
                    : 'bg-dark-900/60 text-white/50 hover:text-white hover:bg-dark-800 border border-white/[0.06]'
                }`}
              >
                Alle
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/blog?category=${cat.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categorySlug === cat.slug
                      ? 'bg-primary text-white'
                      : 'bg-dark-900/60 text-white/50 hover:text-white hover:bg-dark-800 border border-white/[0.06]'
                  }`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 bg-dark">
        <div className="container-main">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
            {posts.map((post, i) => {
              const category = post.categories?.[0]?.category?.name;
              return (
                <ScrollReveal key={post.id} delay={i * 0.05}>
                  <Link href={`/blog/${post.slug}`} className="group block h-full">
                    <article className="h-full rounded-2xl border border-white/[0.06] bg-dark-900/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-glow-sm">
                      {post.featuredImage && (
                        <div className="aspect-video overflow-hidden">
                          <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        </div>
                      )}
                      <div className="p-6">
                        {category && (
                          <span className="inline-block px-3 py-1 rounded-full bg-primary/[0.08] border border-primary/20 text-primary text-xs font-medium mb-3">{category}</span>
                        )}
                        <h2 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h2>
                        {post.excerpt && <p className="text-sm text-white/40 mb-4 line-clamp-3">{post.excerpt}</p>}
                        <div className="flex items-center justify-between text-xs text-white/30">
                          <div className="flex items-center gap-3">
                            {post.publishedAt && (
                              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(post.publishedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            )}
                            {post.readingTime && (
                              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.readingTime} Min.</span>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </article>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/40 text-lg">Noch keine Blogbeiträge vorhanden.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-16">
              {currentPage > 1 && (
                <Link
                  href={`/blog?page=${currentPage - 1}${categorySlug ? `&category=${categorySlug}` : ''}`}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-dark-900/60 border border-white/[0.06] text-white/50 hover:text-white hover:border-primary/30 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Zurück
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Link
                  key={pageNum}
                  href={`/blog?page=${pageNum}${categorySlug ? `&category=${categorySlug}` : ''}`}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                    pageNum === currentPage
                      ? 'bg-primary text-white'
                      : 'bg-dark-900/60 border border-white/[0.06] text-white/50 hover:text-white hover:border-primary/30'
                  }`}
                >
                  {pageNum}
                </Link>
              ))}
              {currentPage < totalPages && (
                <Link
                  href={`/blog?page=${currentPage + 1}${categorySlug ? `&category=${categorySlug}` : ''}`}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-dark-900/60 border border-white/[0.06] text-white/50 hover:text-white hover:border-primary/30 transition-colors text-sm"
                >
                  Weiter <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
