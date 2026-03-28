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
  const post = await prisma.post.findUnique({
    where: { slug },
    include: { seo: true },
  });

  if (!post?.seo) {
    return {
      title: post?.title || 'Blog | iKFZ Digital Zulassung',
      description: post?.excerpt || undefined,
      alternates: {
        canonical: `${SITE_URL}/blog/${slug}/`,
      },
    };
  }

  const seo = post.seo;
  return {
    title: seo.metaTitle || post.title,
    description: seo.metaDescription || post.excerpt || undefined,
    alternates: {
      canonical: seo.canonicalUrl || `${SITE_URL}/blog/${post.slug}/`,
    },
    openGraph: {
      title: seo.ogTitle || seo.metaTitle || post.title,
      description: seo.ogDescription || seo.metaDescription || undefined,
      url: seo.canonicalUrl || `${SITE_URL}/blog/${post.slug}/`,
      siteName: 'ikfzdigitalzulassung.de',
      locale: 'de_DE',
      type: 'article',
      images: seo.ogImage ? [{ url: seo.ogImage }] : [{ url: DEFAULT_OG_IMAGE }],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: (seo.twitterCard as 'summary_large_image' | 'summary') || 'summary_large_image',
      title: seo.twitterTitle || seo.metaTitle || post.title,
      description: seo.twitterDesc || seo.metaDescription || undefined,
      images: seo.twitterImage ? [seo.twitterImage] : seo.ogImage ? [seo.ogImage] : undefined,
    },
    robots: seo.robots || undefined,
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
    const post = await prisma.post.findUnique({
      where: { slug },
      include: { seo: true },
    });
    return post?.seo?.schemaJson || null;
  }
}
