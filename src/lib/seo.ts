import prisma from './db';
import type { Metadata } from 'next';

const SITE_URL = 'https://ikfzdigitalzulassung.de';
const DEFAULT_OG_IMAGE = `${SITE_URL}/uploads/2024/11/cropped-ikfz-logo-08.png`;

export async function getPageSEO(slug: string): Promise<Metadata> {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { seo: true },
  });

  if (!page?.seo) {
    return {
      title: page?.title || 'iKFZ Digital Zulassung',
      description: page?.excerpt || 'KFZ Zulassung online – sofort losfahren oder online abmelden',
      alternates: {
        canonical: `${SITE_URL}/${slug}/`,
      },
    };
  }

  const seo = page.seo;
  return {
    title: seo.metaTitle || page.title,
    description: seo.metaDescription || page.excerpt || undefined,
    alternates: {
      canonical: seo.canonicalUrl || `${SITE_URL}/${slug}/`,
    },
    openGraph: {
      title: seo.ogTitle || seo.metaTitle || page.title,
      description: seo.ogDescription || seo.metaDescription || undefined,
      url: seo.canonicalUrl || `${SITE_URL}/${slug}/`,
      siteName: 'ikfzdigitalzulassung.de',
      locale: 'de_DE',
      type: (seo.ogType as 'website' | 'article') || 'website',
      images: seo.ogImage ? [{ url: seo.ogImage }] : [{ url: DEFAULT_OG_IMAGE }],
    },
    twitter: {
      card: (seo.twitterCard as 'summary_large_image' | 'summary') || 'summary_large_image',
      title: seo.twitterTitle || seo.metaTitle || page.title,
      description: seo.twitterDesc || seo.metaDescription || undefined,
      images: seo.twitterImage ? [seo.twitterImage] : seo.ogImage ? [seo.ogImage] : undefined,
    },
    robots: seo.robots || undefined,
  };
}

export async function getPostSEO(slug: string): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({ where: { slug } });

  if (!post) {
    return { title: 'Blog | iKFZ Digital Zulassung', alternates: { canonical: `${SITE_URL}/insiderwissen/${slug}/` } };
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    alternates: { canonical: post.canonical || `${SITE_URL}/insiderwissen/${post.slug}/` },
    openGraph: {
      title: post.ogTitle || post.metaTitle || post.title,
      description: post.ogDescription || post.metaDescription || undefined,
      url: post.canonical || `${SITE_URL}/insiderwissen/${post.slug}/`,
      siteName: 'ikfzdigitalzulassung.de',
      locale: 'de_DE',
      type: 'article',
      images: post.ogImage ? [{ url: post.ogImage }] : [{ url: DEFAULT_OG_IMAGE }],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.ogTitle || post.metaTitle || post.title,
      description: post.ogDescription || post.metaDescription || undefined,
      images: post.ogImage ? [post.ogImage] : undefined,
    },
  };
}

export async function getSchemaJsonLd(slug: string, type: 'page' | 'post' = 'page'): Promise<string | null> {
  if (type === 'page') {
    const page = await prisma.page.findUnique({
      where: { slug },
      include: { seo: true },
    });
    return page?.seo?.schemaJson || null;
  } else {
    // BlogPost has inline SEO, no schemaJson field
    return null;
  }
}
