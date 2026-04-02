import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

/* ── Single Source of Truth: Database Resolution ──────────────────
 *
 * PRODUCTION RUNTIME:
 *   DB_PATH env var is REQUIRED. It must point to the persistent
 *   production.db on the server. If not set or file missing → crash.
 *   Fallback: prisma/production.db symlink (set by deploy scripts).
 *
 * BUILD TIME (next build):
 *   DB_PATH should point to the database used for page pre-rendering.
 *   On VPS: export DB_PATH=production.db before build.
 *   On local→remote (Hostinger): DB_PATH=dev.db for pre-render,
 *   ISR (revalidate=60) refreshes from production DB at runtime.
 *
 * DEVELOPMENT:
 *   DB_PATH env var OR prisma/dev.db (local development only).
 *
 * There is NO silent fallback from production RUNTIME → dev.db.
 * ────────────────────────────────────────────────────────────────── */

function getDbPath(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  // next build sets NEXT_PHASE=phase-production-build
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  // 1. Explicit DB_PATH env var (set in production deploy & build scripts)
  if (process.env.DB_PATH) {
    if (!fs.existsSync(process.env.DB_PATH)) {
      const msg = `[DB] ❌ DB_PATH is set but file does not exist: ${process.env.DB_PATH}`;
      console.error(msg);
      if (isProduction && !isBuildPhase) throw new Error(msg);
    }
    return process.env.DB_PATH;
  }

  // 2. Production fallback: symlink at prisma/production.db (created by deploy scripts)
  const prodPath = path.join(process.cwd(), 'prisma', 'production.db');
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }

  // 3. Development fallback: prisma/dev.db
  const devPath = path.join(process.cwd(), 'prisma', 'dev.db');

  // During build: allow dev.db as fallback (ISR will refresh from production at runtime)
  if (isBuildPhase && fs.existsSync(devPath)) {
    console.warn('[DB] ⚠ Build phase: using dev.db for pre-rendering. ISR will refresh from production DB at runtime.');
    return devPath;
  }

  // In production RUNTIME, DB_PATH MUST be set — never fall through to dev.db
  if (isProduction && !isBuildPhase) {
    const msg = `[DB] ❌ PRODUCTION ERROR: No database found!\n` +
      `  DB_PATH env: (not set)\n` +
      `  Symlink: ${prodPath} (not found)\n` +
      `  cwd: ${process.cwd()}\n` +
      `  ⚠ Set DB_PATH in .env or ecosystem.config.js to fix this.`;
    console.error(msg);
    throw new Error(msg);
  }

  // Development: prisma/dev.db
  if (!fs.existsSync(devPath)) {
    console.error(`[DB] ⚠ Dev database not found at ${devPath}. Run: npx prisma migrate dev`);
  }
  return devPath;
}

function createPrismaClient() {
  const dbPath = getDbPath();
  const isProduction = process.env.NODE_ENV === 'production';
  try {
    const resolvedPath = fs.existsSync(dbPath) ? fs.realpathSync(dbPath) : dbPath;

    // Log which database is actually being used
    const dbType = resolvedPath.includes('production.db') ? '🟢 PRODUCTION' :
                   resolvedPath.includes('dev.db') ? '🟡 DEVELOPMENT' : '⚪ UNKNOWN';
    console.log(`[DB] ${dbType} → ${resolvedPath}`);

    // Safety: warn loudly if production code is hitting dev.db
    if (isProduction && resolvedPath.includes('dev.db')) {
      console.error('[DB] ❌ CRITICAL: Production is using dev.db! Set DB_PATH to production.db');
    }

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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache in all environments to prevent multiple DB connections
globalForPrisma.prisma = prisma;

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
