/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: [
      'better-sqlite3',
      '@prisma/adapter-better-sqlite3',
    ],
    // Database is persistent on disk — not bundled into build
    outputFileTracingIncludes: {},
  },
  images: {
    // AVIF disabled: sharp on Hostinger shared hosting produces corrupt AVIF files
    formats: ['image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
      {
        source: '/shop',
        destination: '/',
        permanent: true,
      },
      {
        source: '/my-account',
        destination: '/',
        permanent: true,
      },
      {
        source: '/my-account/:path*',
        destination: '/',
        permanent: true,
      },
      // WordPress legacy redirects
      {
        source: '/sitemap_index.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/wp-sitemap.xml',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/wp-sitemap:path*',
        destination: '/sitemap.xml',
        permanent: true,
      },
      {
        source: '/wp-admin/:path*',
        destination: '/',
        permanent: true,
      },
      // NOTE: /wp-content/uploads/* is served via middleware rewrite to /uploads/*
      // Only redirect non-upload wp-content paths
      {
        source: '/wp-content/themes/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/wp-content/plugins/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-json/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-includes/:path*',
        destination: '/',
        permanent: true,
      },
      {
        source: '/xmlrpc.php',
        destination: '/',
        permanent: true,
      },
      {
        source: '/wp-cron.php',
        destination: '/',
        permanent: true,
      },
      {
        source: '/feed',
        destination: '/insiderwissen/',
        permanent: true,
      },
      {
        source: '/feed/:path*',
        destination: '/insiderwissen/',
        permanent: true,
      },
      {
        source: '/category/:path*',
        destination: '/insiderwissen/',
        permanent: true,
      },
      {
        source: '/tag/:path*',
        destination: '/insiderwissen/',
        permanent: true,
      },
      {
        source: '/author/:path*',
        destination: '/insiderwissen/',
        permanent: true,
      },
      {
        source: '/index.php/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/wp-content/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/insiderwissen',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/insiderwissen(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
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
        // Uploaded files
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // All pages — security headers + LiteSpeed cache prevention
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Prevent LiteSpeed from caching HTML and serving it for RSC requests
          { key: 'X-LiteSpeed-Cache-Control', value: 'no-cache' },
          { key: 'Vary', value: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
