export const siteConfig = {
  name: 'IKFZ Digital Zulassung',
  description:
    'KFZ Zulassung online – Auto online anmelden in wenigen Minuten. Ohne Termin bei der Behörde. Offiziell registrierter i-Kfz Dienstleister beim KBA.',
  url: 'https://ikfzdigitalzulassung.de',
  ogImage: 'https://ikfzdigitalzulassung.de/uploads/2021/08/logo-v2-01-1.png',
  links: {
    whatsapp: 'https://wa.me/4915224999190',
    phone: 'tel:+4915224999190',
    email: 'mailto:info@ikfzdigitalzulassung.de',
    onlineAbmelden: 'https://onlineautoabmelden.com/',
    meldino: 'https://www.meldino.de/',
  },
  company: {
    name: 'iKFZ Digital Zulassung UG (haftungsbeschränkt)',
    address: 'Gerhard-Küchen-Straße 14, 45141 Essen, Deutschland',
    phone: '+49 1522 4999190',
    email: 'info@ikfzdigitalzulassung.de',
    ceo: 'Mariam Al Kak',
    registrationCourt: 'Amtsgericht Essen',
    registrationNumber: 'HRB 36109',
    taxNumber: '111/5719/2552',
  },
  nav: [
    {
      label: 'Zulassungsservices',
      href: '/kfz-service/kfz-online-service/',
      children: [
        { label: 'Motorrad Online Anmelden', href: '/motorrad-online-anmelden/' },
        { label: 'Auto Online Anmelden', href: '/product/auto-online-anmelden/' },
        { label: 'KFZ Online Abmelden', href: '/product/fahrzeugabmeldung/' },
      ],
    },
    {
      label: 'Dienstleistungen',
      href: '/kfz-services/',
      children: [
        { label: 'eVB-Nummer anfordern', href: '/evb/' },
        { label: 'KFZ-Versicherung berechnen', href: '/kfz-versicherung-berechnen/' },
        { label: 'Auto verkaufen', href: '/auto-verkaufen/' },
      ],
    },
    { label: 'Blog', href: '/blog/' },
    { label: 'Fragen & Antworten', href: '/faq/' },
  ],
  footerLinks: {
    services: [
      { label: 'Jetzt Kfz online anmelden', href: '/product/auto-online-anmelden/' },
      { label: 'Jetzt KFZ online abmelden', href: '/product/fahrzeugabmeldung/' },
      { label: 'eVB-Nummer anfordern', href: '/evb/' },
      { label: 'KFZ Zulassung Online Deutschlandweit', href: '/kfz-zulassung-in-deiner-stadt/' },
    ],
    legal: [
      { label: 'Impressum', href: '/impressum' },
      { label: 'Datenschutzerklärung', href: '/datenschutzerklarung' },
      { label: 'Allgemeine Geschäftsbedingungen', href: '/agb' },
      { label: 'Blog', href: '/blog/' },
    ],
  },
  pricing: {
    registration: 99.70,
    deregistration: 19.70,
    reservedPlate: 24.70,
    platePurchase: 29.70,
    baseService: 124.70,
  },
} as const;
