import { NextRequest, NextResponse } from 'next/server';

// NOTE: Middleware runs in Edge Runtime (Next.js 14).
// `jsonwebtoken` (Node.js crypto) does NOT work here.
// We only check cookie EXISTENCE in middleware.
// Full JWT verification happens in route handlers (Node.js runtime).

const ADMIN_TOKEN = 'admin_token';
const CUSTOMER_TOKEN = 'customer_token';

// ── Lightweight Edge-compatible rate limiter ─────────────────────
// Protects API routes from abuse. 120 requests per minute per IP.
const API_RATE_LIMIT = 120;
const API_RATE_WINDOW = 60_000; // 1 minute
const MAX_RATE_ENTRIES = 5_000;
const apiRateStore = new Map<string, { count: number; resetAt: number }>();

function checkApiRateLimit(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = apiRateStore.get(ip);

  if (!entry || entry.resetAt < now) {
    if (apiRateStore.size >= MAX_RATE_ENTRIES) {
      // Evict oldest entry
      const firstKey = apiRateStore.keys().next().value;
      if (firstKey) apiRateStore.delete(firstKey);
    }
    apiRateStore.set(ip, { count: 1, resetAt: now + API_RATE_WINDOW });
    return { ok: true, remaining: API_RATE_LIMIT - 1 };
  }

  entry.count++;
  if (entry.count > API_RATE_LIMIT) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: API_RATE_LIMIT - entry.count };
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // 0. Global API rate limiting (120 req/min per IP)
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const { ok, remaining } = checkApiRateLimit(ip);
    if (!ok) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(API_RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // 1. www → non-www 301 redirect
  if (hostname.startsWith('www.')) {
    const nonWwwHost = hostname.replace(/^www\./, '');
    return NextResponse.redirect(
      new URL(`${url.protocol}//${nonWwwHost}${url.pathname}${url.search}`),
      301
    );
  }

  // 2. WordPress legacy redirects (301)
  const wpRedirects: Record<string, string> = {
    '/feed': '/',
    '/feed/': '/',
    '/rss': '/',
    '/rss/': '/',
    '/comments/feed': '/',
    '/comments/feed/': '/',
    '/wp-login.php': '/',
    '/wp-admin': '/admin/',
    '/wp-admin/': '/admin/',
    '/wp-signup.php': '/',
    '/xmlrpc.php': '/',
    '/wp-json': '/api/',
    '/wp-json/': '/api/',
    '/shop': '/kfz-services/',
    '/shop/': '/kfz-services/',
  };

  // Exact match redirects
  const wpTarget = wpRedirects[pathname];
  if (wpTarget) {
    return NextResponse.redirect(new URL(wpTarget, request.url), 301);
  }

  // Serve old /wp-content/uploads/ URLs from /uploads/
  if (pathname.startsWith('/wp-content/uploads/')) {
    const newPath = pathname.replace('/wp-content/uploads/', '/uploads/');
    return NextResponse.rewrite(new URL(newPath, request.url));
  }

  // Prefix-based WP redirects (non-upload wp-content, wp-includes, wp-json)
  if (pathname.startsWith('/wp-content/') || pathname.startsWith('/wp-includes/') || pathname.startsWith('/wp-json/')) {
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  // WP author pages
  if (pathname.startsWith('/author/') || pathname.startsWith('/author')) {
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  // WP category/tag archives
  if (pathname.startsWith('/category/') || pathname.startsWith('/tag/')) {
    return NextResponse.redirect(new URL('/insiderwissen/', request.url), 301);
  }

  // WP pagination patterns /page/N/
  if (/^\/page\/\d+\/?$/.test(pathname)) {
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  // 3. Admin API protection — lightweight cookie check
  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminAuthApi = pathname === '/api/admin/auth' || pathname === '/api/admin/auth/';
  const isAdminHealthApi = pathname === '/api/admin/health' || pathname === '/api/admin/health/';

  if (isAdminApi && !isAdminAuthApi && !isAdminHealthApi) {
    if (!request.cookies.has(ADMIN_TOKEN)) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 4. Customer API protection — lightweight cookie check
  const isCustomerApi = pathname.startsWith('/api/customer');

  if (isCustomerApi) {
    if (!request.cookies.has(CUSTOMER_TOKEN)) {
      return new NextResponse(JSON.stringify({ error: 'Nicht angemeldet.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 5. Customer account pages (/konto/*) — redirect to login if no cookie
  const isKontoPage = pathname.startsWith('/konto');

  if (isKontoPage) {
    if (!request.cookies.has(CUSTOMER_TOKEN)) {
      const loginUrl = new URL('/anmelden', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 6. Prevent LiteSpeed from caching page responses.
  const response = NextResponse.next();
  response.headers.set('X-LiteSpeed-Cache-Control', 'no-cache');
  response.headers.set('Vary', 'RSC, Next-Router-State-Tree, Next-Router-Prefetch');

  // 7. Admin APIs: force no-store to prevent any proxy/CDN caching
  if (isAdminApi) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads|manifest.json|sitemap.xml|robots.txt).*)',
  ],
};
