import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function run() {
  const result = await prisma.payment.updateMany({
    where: { status: 'completed' },
    data: { status: 'paid' },
  });
  console.log('Updated', result.count, 'payments from completed to paid');

  const molliePayments = await prisma.payment.updateMany({
    where: { transactionId: { startsWith: 'tr_' }, gateway: null },
    data: { gateway: 'mollie' },
  });
  console.log('Backfilled', molliePayments.count, 'Mollie gateway records');

  const paypalPayments = await prisma.payment.updateMany({
    where: { method: 'paypal', gateway: null },
    data: { gateway: 'paypal' },
  });
  console.log('Backfilled', paypalPayments.count, 'PayPal gateway records');

  await prisma.$disconnect();
}

run();
