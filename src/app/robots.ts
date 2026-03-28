import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/antragsuebersicht/',
        '/antragsuebersicht-2/',
        '/bezahlmoeglichkeiten/',
        '/kennzeichen-bestellen/',
      ],
    },
    sitemap: 'https://ikfzdigitalzulassung.de/sitemap.xml',
  };
}
