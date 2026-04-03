import Link from 'next/link';
import Image from 'next/image';

interface BlogCardProps {
  post: {
    slug: string;
    title: string;
    excerpt: string;
    featuredImage: string;
    publishedAt: Date | string | null;
    category: string;
  };
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

export default function BlogCard({ post }: BlogCardProps) {
  const dateStr = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const plainExcerpt = stripHtml(post.excerpt).slice(0, 160);

  return (
    <Link href={`/insiderwissen/${post.slug}/`} className="group block h-full">
      <article className="h-full rounded-2xl border border-white/[0.06] bg-dark-900/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1">
        {post.featuredImage && (
          <div className="aspect-[16/10] overflow-hidden relative">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-6">
          {dateStr && (
            <p className="text-xs text-white/30 mb-2">{dateStr}</p>
          )}
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          {plainExcerpt && (
            <p className="text-sm text-white/40 mb-4 line-clamp-3">{plainExcerpt}</p>
          )}
          <span className="inline-flex items-center gap-1 text-primary text-sm font-medium group-hover:gap-2 transition-all">
            Weiterlesen
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </article>
    </Link>
  );
}
