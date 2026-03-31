/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    instrumentationHook: true,
    outputFileTracingIncludes: {
      '/**': ['./prisma/dev.db'],
    },
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
  async headers() {
    return [
      {
        // Static assets — immutable cache
        source: '/:path*.(ico|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Next.js static chunks
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Next.js image optimization
        source: '/_next/image/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        // All pages — short cache with revalidation
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
