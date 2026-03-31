import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

function getDbPath(): string {
  const srcPath = path.join(process.cwd(), 'prisma', 'dev.db');

  // On Vercel (production), copy DB to /tmp so it's writable
  if (process.env.VERCEL) {
    const tmpPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpPath)) {
      fs.copyFileSync(srcPath, tmpPath);
    }
    return tmpPath;
  }

  return srcPath;
}

function createPrismaClient() {
  const dbPath = getDbPath();
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

// ── Helper functions ──

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { images: true },
  });
}

export async function getActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true, status: 'publish' },
    include: { images: true },
    orderBy: { name: 'asc' },
  });
}

export async function createOrder(data: {
  productName: string;
  serviceData: string;
  total: number;
  subtotal: number;
  paymentMethod: string;
  paymentMethodTitle: string;
  paymentFee?: number;
  billingFirstName: string;
  billingLastName: string;
  billingEmail: string;
  billingPhone: string;
  billingAddress1?: string;
  billingCity?: string;
  billingPostcode?: string;
  billingCountry?: string;
  customerNote?: string;
  items: { name: string; quantity: number; price: number; total: number }[];
}) {
  const orderNumber = `IKFZ-${Date.now().toString(36).toUpperCase()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      status: 'pending',
      currency: 'EUR',
      total: data.total,
      subtotal: data.subtotal,
      paymentMethod: data.paymentMethod,
      paymentMethodTitle: data.paymentMethodTitle,
      paymentFee: data.paymentFee ?? 0,
      productName: data.productName,
      serviceData: data.serviceData,
      billingFirstName: data.billingFirstName,
      billingLastName: data.billingLastName,
      billingEmail: data.billingEmail,
      billingPhone: data.billingPhone,
      billingAddress1: data.billingAddress1,
      billingCity: data.billingCity,
      billingPostcode: data.billingPostcode,
      billingCountry: data.billingCountry ?? 'DE',
      customerNote: data.customerNote,
      items: {
        create: data.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      },
    },
    include: { items: true },
  });

  // Create invoice
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  await prisma.invoice.create({
    data: {
      orderId: order.id,
      invoiceNumber,
      status: 'issued',
      amount: data.total,
      currency: 'EUR',
      billingName: `${data.billingFirstName} ${data.billingLastName}`,
      billingEmail: data.billingEmail,
      billingAddress: [data.billingAddress1, data.billingPostcode, data.billingCity].filter(Boolean).join(', '),
      items: JSON.stringify(data.items),
    },
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      orderId: order.id,
      method: data.paymentMethod,
      methodTitle: data.paymentMethodTitle,
      status: 'pending',
      amount: data.total,
      currency: 'EUR',
    },
  });

  return order;
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, invoice: true },
  });
}

// ── Blog Helper functions ──

import { unstable_cache } from 'next/cache';

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export const getAllPosts = unstable_cache(
  async (page: number = 1, perPage: number = 9, categoryFilter?: string) => {
    const where: any = { status: 'publish' };
    if (categoryFilter) where.category = categoryFilter;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { posts, total, totalPages: Math.ceil(total / perPage) };
  },
  ['blog-posts'],
  { revalidate: 300, tags: ['blog-posts'] }
);

export const getPostBySlug = unstable_cache(
  async (slug: string) => {
    return prisma.blogPost.findUnique({ where: { slug } });
  },
  ['blog-post'],
  { revalidate: 60 }
);

export async function getAllPostSlugs() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'publish' },
    select: { slug: true },
  });
  return posts.map(p => p.slug);
}

export const getCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      where: { count: { gt: 0 } },
      orderBy: { count: 'desc' },
    });
  },
  ['blog-categories'],
  { revalidate: 300, tags: ['blog-categories'] }
);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ikfzdigitalzulassung.de';

export function buildSEOMetadata(item: {
  title: string;
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  featuredImage?: string;
  robots?: string;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string | null;
}, siteUrl: string = SITE_URL) {
  const siteSuffix = ' | IKFZ Digital Zulassung';
  const rawTitle = item.metaTitle || item.title;
  // Truncate title to fit within ~60 chars (Google's display limit)
  const title = rawTitle.length > 55 ? rawTitle.slice(0, 55) : rawTitle;
  const description = item.metaDescription || item.excerpt || '';
  const canonical = `${siteUrl}/${item.slug}/`;
  const ogImage = item.ogImage || item.featuredImage || '';

  const isProduction = process.env.NODE_ENV === 'production';
  const robots = isProduction
    ? (item.robots || 'index, follow')
    : 'noindex, nofollow';

  return {
    // Use raw title — layout template adds ' | IKFZ Digital Zulassung'
    title,
    description,
    alternates: { canonical },
    robots,
    openGraph: {
      title: item.ogTitle || title,
      description: item.ogDescription || description,
      url: canonical,
      type: 'article' as const,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      ...(item.publishedAt ? { publishedTime: new Date(item.publishedAt).toISOString() } : {}),
      ...(item.updatedAt ? { modifiedTime: new Date(item.updatedAt).toISOString() } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: item.ogTitle || title,
      description: item.ogDescription || description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
