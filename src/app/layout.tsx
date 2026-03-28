import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import SiteShell from '@/components/SiteShell';
import { siteConfig } from '@/lib/config';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'KFZ Zulassung online – Auto online anmelden | IKFZ Digital Zulassung',
    template: '%s | IKFZ Digital Zulassung',
  },
  description: siteConfig.description,
  keywords: [
    'KFZ Zulassung online',
    'Auto online anmelden',
    'Fahrzeug anmelden online',
    'KFZ Abmeldung online',
    'eVB Nummer',
    'Wunschkennzeichen',
    'digitale Zulassung',
    'iKfz',
    'KBA registriert',
    'Fahrzeugzulassung',
  ],
  authors: [{ name: 'IKFZ Digital Zulassung' }],
  creator: 'IKFZ Digital Zulassung',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: siteConfig.url,
    title: 'KFZ Zulassung online – Auto online anmelden | IKFZ Digital Zulassung',
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'IKFZ Digital Zulassung',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KFZ Zulassung online – Auto online anmelden',
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={inter.variable}>
      <head>
        {/* JSON-LD Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: siteConfig.company.name,
              url: siteConfig.url,
              logo: siteConfig.ogImage,
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: siteConfig.company.phone,
                contactType: 'customer service',
                availableLanguage: ['German', 'English'],
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Gerhard-Küchen-Straße 14',
                addressLocality: 'Essen',
                postalCode: '45141',
                addressCountry: 'DE',
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <SiteShell><Navbar /></SiteShell>
        <main className="min-h-screen">{children}</main>
        <SiteShell>
          <Footer />
          <WhatsAppFloat />
        </SiteShell>
      </body>
    </html>
  );
}
