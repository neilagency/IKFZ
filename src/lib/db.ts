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
