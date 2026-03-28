/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
  async rewrites() {
    return [];
  },
};

module.exports = nextConfig;
