/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  experimental: {
    instrumentationHook: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      // Homepage duplicate
      {
        source: '/starseite-2',
        destination: '/',
        permanent: true,
      },
      // WooCommerce pages no longer exist
      {
        source: '/warenkorb',
        destination: '/',
        permanent: true,
      },
      {
        source: '/mein-konto',
        destination: '/',
        permanent: true,
      },
      {
        source: '/kasse',
        destination: '/',
        permanent: true,
      },
      // Redirect old service URLs to new product pages
      {
        source: '/auto-online-anmelden',
        destination: '/product/auto-online-anmelden/',
        permanent: true,
      },
      {
        source: '/kfz-online-abmelden',
        destination: '/product/fahrzeugabmeldung/',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
