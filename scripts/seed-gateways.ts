/**
 * Seed Payment Gateways
 * =====================
 * Run: npx tsx scripts/seed-gateways.ts
 *
 * Upserts the 5 standard payment gateways into the PaymentGateway table.
 */

import prisma from '../src/lib/db';

const gateways = [
  {
    gatewayId: 'paypal',
    name: 'PayPal',
    description: 'Schnell & sicher mit PayPal bezahlen',
    isEnabled: true,
    fee: 0,
    icon: '/images/payment/paypal.svg',
    sortOrder: 1,
  },
  {
    gatewayId: 'mollie_creditcard',
    name: 'Kredit- / Debitkarte',
    description: 'Visa, Mastercard, American Express via Mollie',
    isEnabled: true,
    fee: 0.50,
    icon: '/images/payment/card.svg',
    sortOrder: 2,
  },
  {
    gatewayId: 'mollie_applepay',
    name: 'Apple Pay',
    description: 'Bezahlen mit Apple Pay via Mollie',
    isEnabled: true,
    fee: 0,
    icon: '/images/payment/applepay.svg',
    sortOrder: 3,
  },
  {
    gatewayId: 'sepa',
    name: 'SEPA-Überweisung',
    description: 'Direkte Banküberweisung – keine Gebühren',
    isEnabled: true,
    fee: 0,
    icon: '/images/payment/sepa.svg',
    sortOrder: 4,
  },
  {
    gatewayId: 'mollie_klarna',
    name: 'Klarna',
    description: 'Sofort bezahlen, später zahlen oder in Raten via Klarna',
    isEnabled: true,
    fee: 0,
    icon: '/images/payment/klarna.svg',
    sortOrder: 5,
  },
];

async function main() {
  console.log('Seeding payment gateways...');

  for (const gw of gateways) {
    await prisma.paymentGateway.upsert({
      where: { gatewayId: gw.gatewayId },
      update: {},
      create: gw,
    });
    console.log(`  ✓ ${gw.gatewayId} → ${gw.name}`);
  }

  console.log(`\nDone: ${gateways.length} gateways seeded.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
