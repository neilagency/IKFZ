import { MetadataRoute } from 'next';
import prisma from '@/lib/db';

const SITE_URL = 'https://ikfzdigitalzulassung.de';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
  // Fetch all published pages with SEO data to check robots directives
  const pages = await prisma.page.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true, pageType: true, seo: { select: { robots: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch all published blog posts from DB
  const posts = await prisma.blogPost.findMany({
    where: { status: 'publish' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });

  // Fetch active products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  // Static routes with high priority
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/kfz-service/kfz-online-service/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
  ];

  // Slugs to exclude from sitemap
  const excludedSlugs = new Set([
    'antragsuebersicht', 'antragsuebersicht-2', 'warenkorb', 'mein-konto', 'kasse',
    'starseite-2', 'startseite', // handled by homepage
    'bezahlmoeglichkeiten', 'kennzeichen-bestellen', // noindex pages
    'ikfzdigitalblog', // internal/unused
  ]);

  // Page routes from DB (exclude noindex pages and excluded slugs)
  const pageRoutes: MetadataRoute.Sitemap = pages
    .filter(p => {
      if (excludedSlugs.has(p.slug)) return false;
      // Exclude pages with noindex robots directive
      if (p.seo?.robots && p.seo.robots.includes('noindex')) return false;
      return true;
    })
    .map(page => {
      // Determine URL based on slug (with trailing slash)
      let url = `${SITE_URL}/${page.slug}/`;
      
      // Special routes
      if (page.slug === 'kfz-online-service') {
        url = `${SITE_URL}/kfz-service/kfz-online-service/`;
      }

      // Determine priority based on page type
      let priority = 0.7;
      if (page.pageType === 'service') priority = 0.9;
      if (page.pageType === 'city') priority = 0.8;
      if (page.pageType === 'legal') priority = 0.5;
      if (page.pageType === 'landing') priority = 0.9;

      return {
        url,
        lastModified: page.updatedAt,
        changeFrequency: page.pageType === 'city' ? 'weekly' as const : 'monthly' as const,
        priority,
      };
    });

  // Blog post routes — URLs are /{slug}/ (catch-all)
  const postRoutes: MetadataRoute.Sitemap = posts.map(post => ({
    url: `${SITE_URL}/${post.slug}/`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Blog listing page
  const blogRoute: MetadataRoute.Sitemap = [{
    url: `${SITE_URL}/insiderwissen/`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }];

  // Product pages
  const productRoutes: MetadataRoute.Sitemap = products.map(product => ({
    url: `${SITE_URL}/product/${product.slug}/`,
    lastModified: product.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...pageRoutes, ...productRoutes, ...blogRoute, ...postRoutes];
  } catch (e) {
    console.warn('[sitemap] DB not available:', (e as Error).message);
    return [{ url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 }];
  }
}
