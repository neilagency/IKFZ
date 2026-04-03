import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

/* ── Single Source of Truth: Database Resolution ──────────────────
 *
 * PRODUCTION (Hostinger / VPS):
 *   DB_PATH env var → persistent production database.
 *   Set automatically by scripts/setup-production-db.js (Hostinger)
 *   or deploy/deploy.sh (VPS). No fallbacks — crash if not set.
 *
 * DEVELOPMENT (local machine only):
 *   DB_PATH env var OR prisma/dev.db.
 *
 * ────────────────────────────────────────────────────────────────── */

function getDbPath(): string {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. DB_PATH env var — the primary path
  if (process.env.DB_PATH) {
    if (!fs.existsSync(process.env.DB_PATH)) {
      const msg = `[DB] ❌ DB_PATH is set but file does not exist: ${process.env.DB_PATH}`;
      console.error(msg);
      if (isProduction) throw new Error(msg);
    }
    return process.env.DB_PATH;
  }

  // 2. Production auto-detect: Hostinger persistent database
  //    Runtime CWD may differ from build CWD, so detect by home dir pattern
  if (isProduction) {
    const homeMatch = (process.env.HOME || process.cwd()).match(/\/home\/(u\d+)\//)
      || process.cwd().match(/\/home\/(u\d+)\//);
    if (homeMatch) {
      // Scan for the domain database directory
      const userHome = `/home/${homeMatch[1]}`;
      const domainsDir = path.join(userHome, 'domains');
      if (fs.existsSync(domainsDir)) {
        try {
          const domains = fs.readdirSync(domainsDir);
          for (const domain of domains) {
            const dbFile = path.join(domainsDir, domain, 'database', 'production.db');
            if (fs.existsSync(dbFile)) {
              console.log(`[DB] Auto-detected Hostinger DB: ${dbFile}`);
              return dbFile;
            }
          }
        } catch { /* ignore readdir errors */ }
      }
    }

    const msg = `[DB] ❌ FATAL: DB_PATH is not set in production!\n` +
      `  cwd: ${process.cwd()}\n` +
      `  HOME: ${process.env.HOME}\n` +
      `  Ensure scripts/setup-production-db.js ran before build,\n` +
      `  or set DB_PATH manually in your environment.`;
    console.error(msg);
    throw new Error(msg);
  }

  // 3. Development only: prisma/dev.db
  const devPath = path.join(process.cwd(), 'prisma', 'dev.db');
  if (!fs.existsSync(devPath)) {
    console.error(`[DB] ⚠ Dev database not found at ${devPath}. Run: npx prisma migrate dev`);
  }
  return devPath;
}

function createPrismaClient() {
  const dbPath = getDbPath();
  try {
    const resolvedPath = fs.existsSync(dbPath) ? fs.realpathSync(dbPath) : dbPath;
    console.log(`[DB] 🟢 → ${resolvedPath}`);

    const adapter = new PrismaBetterSqlite3({ url: `file:${resolvedPath}` });
    return new PrismaClient({ adapter });
  } catch (error) {
    console.error(`[DB] Failed to initialize Prisma client (dbPath: ${dbPath}):`, error);
    throw error;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy initialization — prisma client is created on FIRST USE, not at import time.
// This prevents module-level crashes in Next.js standalone/serverless mode.
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as any)[prop];
  },
});

export { prisma };
export default prisma;

// ── Helper functions ──

/* ── Payment Gateway ID maps ──────────────────────────────── */
// DB stores gatewayId (e.g. mollie_creditcard), checkout uses checkoutId (e.g. creditcard)
const GATEWAY_ID_MAP: Record<string, string> = {
  mollie_creditcard: 'creditcard',
  mollie_applepay: 'applepay',
  mollie_klarna: 'klarna',
  paypal: 'paypal',
  sepa: 'sepa',
};

const REVERSE_GATEWAY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(GATEWAY_ID_MAP).map(([k, v]) => [v, k]),
);

export function getCheckoutIdForGateway(gatewayId: string): string {
  return GATEWAY_ID_MAP[gatewayId] || gatewayId;
}

export function getDbGatewayId(checkoutId: string): string {
  return REVERSE_GATEWAY_MAP[checkoutId] || checkoutId;
}

/**
 * Returns all enabled payment gateways, mapped to checkout-friendly shape.
 * Used by the checkout page (visitor-facing).
 */
export async function getEnabledPaymentMethods() {
  const gateways = await prisma.paymentGateway.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      gatewayId: true,
      name: true,
      description: true,
      fee: true,
      icon: true,
    },
  });

  return gateways.map((g) => ({
    id: GATEWAY_ID_MAP[g.gatewayId] || g.gatewayId,
    label: g.name,
    description: g.description,
    fee: g.fee,
    icon: g.icon,
  }));
}

/**
 * Find a gateway by checkout ID (e.g. "creditcard", "paypal").
 * Returns null if the method is not enabled.
 */
export async function getPaymentGatewayByCheckoutId(checkoutId: string) {
  const dbId = REVERSE_GATEWAY_MAP[checkoutId] || checkoutId;

  return prisma.paymentGateway.findFirst({
    where: { gatewayId: dbId, isEnabled: true },
  });
}

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
