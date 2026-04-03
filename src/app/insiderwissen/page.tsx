import { getAllPosts, getCategories } from '@/lib/db';
import Link from 'next/link';
import BlogCard from '@/components/BlogCard';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

export const revalidate = 300;

const POSTS_PER_PAGE = 9;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'kfz-zulassung': 'Alles rund um die KFZ-Zulassung in Deutschland: Von der Online-Anmeldung über Neuzulassung bis hin zur Ummeldung. Erfahren Sie, welche Dokumente Sie benötigen und wie Sie Zeit und Geld sparen können.',
  'kfz-abmeldung': 'Fahrzeug abmelden leicht gemacht: Erfahren Sie alles über die Online-Abmeldung, Außerbetriebsetzung und welche Unterlagen Sie dafür benötigen. Sparen Sie sich den Weg zur Zulassungsstelle.',
  'kfz-ummeldung': 'Fahrzeug ummelden bei Umzug oder Halterwechsel: Alle wichtigen Informationen, Fristen und Dokumente für die KFZ-Ummeldung in Deutschland.',
  'kfz-versicherung': 'Aktuelle Tipps und Informationen zur KFZ-Versicherung: Vergleichen, wechseln und sparen. Alles über Haftpflicht, Teilkasko und Vollkasko.',
  'evb-nummer': 'Die elektronische Versicherungsbestätigung (eVB) erklärt: Was ist eine eVB-Nummer, wie bekommt man sie und wofür wird sie benötigt?',
  'kennzeichen': 'Alles über KFZ-Kennzeichen in Deutschland: Wunschkennzeichen, Saisonkennzeichen, H-Kennzeichen und mehr. Reservierung, Kosten und Voraussetzungen.',
  'tuev-hu': 'TÜV und Hauptuntersuchung (HU): Termine, Kosten, Ablauf und was bei der Prüfung kontrolliert wird. So bereiten Sie Ihr Fahrzeug optimal vor.',
  'fuehrerschein': 'Führerschein-Ratgeber: Von der Beantragung über den Umtausch bis zum internationalen Führerschein. Alle wichtigen Informationen auf einen Blick.',
  'elektroauto': 'Elektromobilität und E-Autos: Förderungen, Zulassung, Versicherung und alles Wissenswerte rund um die Elektrofahrzeuge in Deutschland.',
  'oldtimer': 'Oldtimer-Ratgeber: H-Kennzeichen beantragen, Versicherung, Zulassung und Pflege von Fahrzeugen mit historischem Wert.',
  'motorrad': 'Motorrad-Ratgeber: Zulassung, Versicherung, Saisonkennzeichen und alles Wichtige für Motorradfahrer in Deutschland.',
  'recht-und-gesetz': 'Verkehrsrecht und Gesetzesänderungen: Aktuelle Informationen zu Bußgeldern, Verkehrsregeln und rechtlichen Änderungen im Straßenverkehr.',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const page = parseInt(sp.page || '1', 10);
  const cat = sp.cat;

  if (cat) {
    const categories = await getCategories();
    const category = categories.find(c => c.slug === cat);
    const catName = category?.name || cat;
    return {
      title: `${catName} – Insiderwissen`,
      description: CATEGORY_DESCRIPTIONS[cat] || `Artikel zum Thema ${catName}`,
      robots: 'index, follow',
      alternates: { canonical: 'https://ikfzdigitalzulassung.de/insiderwissen/' },
    };
  }

  if (page > 1) {
    return {
      title: `Insiderwissen – Seite ${page}`,
      description: 'Expertenwissen rund um KFZ-Zulassung, Abmeldung und Ummeldung.',
      robots: 'noindex, follow',
      alternates: { canonical: `https://ikfzdigitalzulassung.de/insiderwissen/?page=${page}` },
    };
  }

  return {
    title: 'Insiderwissen – Kfz-Zulassung, Abmeldung & mehr',
    description: 'Expertenwissen rund um KFZ-Zulassung, Abmeldung, Ummeldung und alles was Sie über Fahrzeugdokumente wissen müssen.',
    robots: 'index, follow',
    alternates: { canonical: 'https://ikfzdigitalzulassung.de/insiderwissen/' },
  };
}

export default async function InsiderwissenPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page || '1', 10));
  const categorySlug = sp.cat || undefined;

  const [{ posts, total, totalPages }, categories] = await Promise.all([
    getAllPosts(currentPage, POSTS_PER_PAGE, categorySlug),
    getCategories(),
  ]);

  // Build pagination window (max 7 pages)
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  function buildUrl(page: number, cat?: string) {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (cat) params.set('cat', cat);
    const qs = params.toString();
    return `/insiderwissen/${qs ? `?${qs}` : ''}`;
  }

  const activeCatDescription = categorySlug ? CATEGORY_DESCRIPTIONS[categorySlug] : undefined;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-dark via-primary-900 to-dark">
        <div className="pt-32 pb-16 md:pt-40 md:pb-20 relative">
          <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="container-main text-center relative z-10">
            <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold uppercase tracking-wider mb-4">
              <BookOpen className="w-4 h-4" /> Insiderwissen
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">Insiderwissen</h1>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Expertenwissen rund um KFZ-Zulassung, Abmeldung, Ummeldung und alles was Sie über Fahrzeugdokumente wissen müssen.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <section className="bg-dark-950 border-b border-white/[0.06] py-4">
          <div className="container-main">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/insiderwissen/"
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
                  href={`/insiderwissen/?cat=${cat.slug}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    categorySlug === cat.slug
                      ? 'bg-primary text-white'
                      : 'bg-dark-900/60 text-white/50 hover:text-white hover:bg-dark-800 border border-white/[0.06]'
                  }`}
                >
                  {cat.name}
                  <span className="ml-1.5 text-xs opacity-60">({cat.count})</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category SEO Description */}
      {activeCatDescription && (
        <section className="bg-dark-950 border-b border-white/[0.06] py-6">
          <div className="container-main">
            <p className="text-white/40 text-sm leading-relaxed max-w-4xl">{activeCatDescription}</p>
          </div>
        </section>
      )}

      {/* Blog Cards Grid */}
      <section className="py-16 md:py-24 bg-dark">
        <div className="container-main">
          {posts.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-white/40 text-lg">Noch keine Blogbeiträge vorhanden.</p>
            </div>
          )}

          {/* Smart Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-16">
              {currentPage > 1 && (
                <Link
                  href={buildUrl(currentPage - 1, categorySlug)}
                  className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-dark-900/60 border border-white/[0.06] text-white/50 hover:text-white hover:border-primary/30 transition-colors text-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Zurück
                </Link>
              )}
              {pages.map((p, i) =>
                p === '...' ? (
                  <span key={`e${i}`} className="px-2 text-white/20 text-sm">...</span>
                ) : (
                  <Link
                    key={p}
                    href={buildUrl(p, categorySlug)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-primary text-white'
                        : 'bg-dark-900/60 border border-white/[0.06] text-white/50 hover:text-white hover:border-primary/30'
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}
              {currentPage < totalPages && (
                <Link
                  href={buildUrl(currentPage + 1, categorySlug)}
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
