/**
 * Seed Products
 * =============
 * Run: npx tsx scripts/seed-products.ts
 *
 * Uses DB_PATH env var if set (production), otherwise falls back to prisma/dev.db.
 * To seed production: DB_PATH=/path/to/production.db npx tsx scripts/seed-products.ts
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'prisma', 'dev.db');
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found: ${dbPath}`);
  console.error('   Set DB_PATH env var or ensure prisma/dev.db exists');
  process.exit(1);
}
console.log(`📦 Seeding products in: ${fs.realpathSync(dbPath)}`);
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Upsert Abmeldung product
  await prisma.product.upsert({
    where: { slug: 'fahrzeugabmeldung' },
    update: {
      name: 'Fahrzeug Online Abmelden',
      price: 19.70,
      regularPrice: 19.70,
      serviceType: 'abmeldung',
      formType: 'abmeldung',
      isActive: true,
      description: 'Melden Sie Ihr Fahrzeug bequem online ab – ohne Termin bei der Zulassungsstelle. Offiziell über das i-Kfz Portal des KBA.',
      shortDescription: 'KFZ Online Abmeldung in wenigen Minuten',
      options: JSON.stringify({
        reservierung: { label: 'Kennzeichenreservierung (1 Jahr)', price: 4.70 },
      }),
      heroTitle: 'Fahrzeug Online Abmelden',
      heroSubtitle: 'Schnell, sicher und offiziell – ohne Wartezeiten bei der Behörde',
      faq: JSON.stringify([
        { question: 'Wie lange dauert die Online-Abmeldung?', answer: 'Die Abmeldung dauert in der Regel nur wenige Minuten. Sie erhalten eine Bestätigung per E-Mail.' },
        { question: 'Was brauche ich für die Online-Abmeldung?', answer: 'Sie benötigen Ihren Fahrzeugschein (Zulassungsbescheinigung Teil I), die Sicherheitscodes der Kennzeichen und die Fahrgestellnummer (FIN).' },
        { question: 'Kann ich mein Kennzeichen reservieren lassen?', answer: 'Ja, Sie können Ihr Kennzeichen für ein Jahr reservieren lassen. Die Gebühr beträgt 4,70 €.' },
        { question: 'Was passiert nach der Abmeldung?', answer: 'Nach erfolgreicher Abmeldung erhalten Sie eine Abmeldebestätigung. Das Fahrzeug ist ab sofort abgemeldet und kann nicht mehr im Straßenverkehr genutzt werden.' },
        { question: 'Muss ich die Kennzeichen abgeben?', answer: 'Nein, bei der Online-Abmeldung müssen Sie die Kennzeichen nicht physisch abgeben. Die Entstempelung erfolgt digital.' },
      ]),
    },
    create: {
      name: 'Fahrzeug Online Abmelden',
      slug: 'fahrzeugabmeldung',
      type: 'simple',
      status: 'publish',
      price: 19.70,
      regularPrice: 19.70,
      currency: 'EUR',
      serviceType: 'abmeldung',
      formType: 'abmeldung',
      isActive: true,
      stockStatus: 'instock',
      description: 'Melden Sie Ihr Fahrzeug bequem online ab – ohne Termin bei der Zulassungsstelle. Offiziell über das i-Kfz Portal des KBA.',
      shortDescription: 'KFZ Online Abmeldung in wenigen Minuten',
      options: JSON.stringify({
        reservierung: { label: 'Kennzeichenreservierung (1 Jahr)', price: 4.70 },
      }),
      heroTitle: 'Fahrzeug Online Abmelden',
      heroSubtitle: 'Schnell, sicher und offiziell – ohne Wartezeiten bei der Behörde',
      faq: JSON.stringify([
        { question: 'Wie lange dauert die Online-Abmeldung?', answer: 'Die Abmeldung dauert in der Regel nur wenige Minuten. Sie erhalten eine Bestätigung per E-Mail.' },
        { question: 'Was brauche ich für die Online-Abmeldung?', answer: 'Sie benötigen Ihren Fahrzeugschein (Zulassungsbescheinigung Teil I), die Sicherheitscodes der Kennzeichen und die Fahrgestellnummer (FIN).' },
        { question: 'Kann ich mein Kennzeichen reservieren lassen?', answer: 'Ja, Sie können Ihr Kennzeichen für ein Jahr reservieren lassen. Die Gebühr beträgt 4,70 €.' },
        { question: 'Was passiert nach der Abmeldung?', answer: 'Nach erfolgreicher Abmeldung erhalten Sie eine Abmeldebestätigung. Das Fahrzeug ist ab sofort abgemeldet und kann nicht mehr im Straßenverkehr genutzt werden.' },
        { question: 'Muss ich die Kennzeichen abgeben?', answer: 'Nein, bei der Online-Abmeldung müssen Sie die Kennzeichen nicht physisch abgeben. Die Entstempelung erfolgt digital.' },
      ]),
    },
  });

  // Upsert Anmeldung product
  await prisma.product.upsert({
    where: { slug: 'auto-online-anmelden' },
    update: {
      name: 'Auto Online Anmelden / Ummelden',
      price: 99.70,
      regularPrice: 124.70,
      serviceType: 'anmeldung',
      formType: 'anmeldung',
      isActive: true,
      description: 'Melden Sie Ihr Fahrzeug bequem online an oder um – Neuzulassung, Ummeldung, Wiederzulassung und Neuwagen. Offiziell über das i-Kfz Portal des KBA.',
      shortDescription: 'KFZ Online Anmeldung / Ummeldung ab 99,70 €',
      options: JSON.stringify({
        services: [
          { key: 'neuzulassung', label: 'Anmelden', price: 124.70 },
          { key: 'ummeldung', label: 'Ummelden', price: 119.70 },
          { key: 'wiederzulassung', label: 'Wiederzulassen', price: 99.70 },
          { key: 'neuwagen', label: 'Neuwagen Zulassung', price: 124.70 },
        ],
        kennzeichen_reserviert: { label: 'Reserviertes Kennzeichen', price: 24.70 },
        kennzeichen_bestellen: { label: 'Kennzeichen bestellen', price: 29.70 },
      }),
      heroTitle: 'Auto Online Anmelden',
      heroSubtitle: 'Neuzulassung, Ummeldung & Wiederzulassung – 100% digital',
      faq: JSON.stringify([
        { question: 'Welche Unterlagen brauche ich?', answer: 'Sie benötigen Ihren Personalausweis (Vorder- & Rückseite), Fahrzeugschein (ZB Teil I), Fahrzeugbrief (ZB Teil II), eVB-Nummer und bei Ummeldung die alten Kennzeichen-Codes.' },
        { question: 'Wie lange dauert die Anmeldung?', answer: 'Die Online-Anmeldung dauert ca. 10-15 Minuten. Die Bearbeitung erfolgt innerhalb von 1-3 Werktagen.' },
        { question: 'Was kostet die Online-Anmeldung?', answer: 'Die Preise variieren je nach Service: Wiederzulassung ab 99,70 €, Neuwagen ab 99,70 €, Ummeldung ab 119,70 €, Neuzulassung ab 124,70 €.' },
        { question: 'Kann ich ein Wunschkennzeichen reservieren?', answer: 'Ja, für 24,70 € können wir Ihr reserviertes Wunschkennzeichen übernehmen.' },
        { question: 'Kann ich Kennzeichen bestellen?', answer: 'Ja, wir können Kennzeichen für Sie bei einem zertifizierten Hersteller bestellen und liefern lassen (29,70 €).' },
      ]),
    },
    create: {
      name: 'Auto Online Anmelden / Ummelden',
      slug: 'auto-online-anmelden',
      type: 'simple',
      status: 'publish',
      price: 99.70,
      regularPrice: 124.70,
      currency: 'EUR',
      serviceType: 'anmeldung',
      formType: 'anmeldung',
      isActive: true,
      stockStatus: 'instock',
      description: 'Melden Sie Ihr Fahrzeug bequem online an oder um – Neuzulassung, Ummeldung, Wiederzulassung und Neuwagen. Offiziell über das i-Kfz Portal des KBA.',
      shortDescription: 'KFZ Online Anmeldung / Ummeldung ab 99,70 €',
      options: JSON.stringify({
        services: [
          { key: 'neuzulassung', label: 'Anmelden', price: 124.70 },
          { key: 'ummeldung', label: 'Ummelden', price: 119.70 },
          { key: 'wiederzulassung', label: 'Wiederzulassen', price: 99.70 },
          { key: 'neuwagen', label: 'Neuwagen Zulassung', price: 124.70 },
        ],
        kennzeichen_reserviert: { label: 'Reserviertes Kennzeichen', price: 24.70 },
        kennzeichen_bestellen: { label: 'Kennzeichen bestellen', price: 29.70 },
      }),
      heroTitle: 'Auto Online Anmelden',
      heroSubtitle: 'Neuzulassung, Ummeldung & Wiederzulassung – 100% digital',
      faq: JSON.stringify([
        { question: 'Welche Unterlagen brauche ich?', answer: 'Sie benötigen Ihren Personalausweis (Vorder- & Rückseite), Fahrzeugschein (ZB Teil I), Fahrzeugbrief (ZB Teil II), eVB-Nummer und bei Ummeldung die alten Kennzeichen-Codes.' },
        { question: 'Wie lange dauert die Anmeldung?', answer: 'Die Online-Anmeldung dauert ca. 10-15 Minuten. Die Bearbeitung erfolgt innerhalb von 1-3 Werktagen.' },
        { question: 'Was kostet die Online-Anmeldung?', answer: 'Die Preise variieren je nach Service: Wiederzulassung ab 99,70 €, Neuwagen ab 99,70 €, Ummeldung ab 119,70 €, Neuzulassung ab 124,70 €.' },
        { question: 'Kann ich ein Wunschkennzeichen reservieren?', answer: 'Ja, für 24,70 € können wir Ihr reserviertes Wunschkennzeichen übernehmen.' },
        { question: 'Kann ich Kennzeichen bestellen?', answer: 'Ja, wir können Kennzeichen für Sie bei einem zertifizierten Hersteller bestellen und liefern lassen (29,70 €).' },
      ]),
    },
  });

  console.log('✅ Products seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
