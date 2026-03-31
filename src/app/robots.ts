import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/konto/',
        '/anmelden/',
        '/bestellung-erfolgreich/',
        '/zahlung-fehlgeschlagen/',
        '/rechnung/',
        '/antragsuebersicht/',
        '/antragsuebersicht-2/',
        '/bezahlmoeglichkeiten/',
        '/kennzeichen-bestellen/',
        '/wp-admin/',
        '/wp-login.php',
        '/wp-content/',
        '/wp-includes/',
        '/feed/',
        '/author/',
        '/category/',
        '/tag/',
      ],
    },
    sitemap: 'https://ikfzdigitalzulassung.de/sitemap.xml',
  };
}
