import { NextRequest, NextResponse } from 'next/server';

// NOTE: Middleware runs in Edge Runtime (Next.js 14).
// `jsonwebtoken` (Node.js crypto) does NOT work here.
// We only check cookie EXISTENCE in middleware.
// Full JWT verification happens in route handlers (Node.js runtime).

const ADMIN_TOKEN = 'admin_token';
const CUSTOMER_TOKEN = 'customer_token';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // 1. www → non-www 301 redirect
  if (hostname.startsWith('www.')) {
    const nonWwwHost = hostname.replace(/^www\./, '');
    return NextResponse.redirect(
      new URL(`${url.protocol}//${nonWwwHost}${url.pathname}${url.search}`),
      301
    );
  }

  // 2. Admin API protection — lightweight cookie check
  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminAuthApi = pathname === '/api/admin/auth' || pathname === '/api/admin/auth/';

  if (isAdminApi && !isAdminAuthApi) {
    if (!request.cookies.has(ADMIN_TOKEN)) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 3. Customer API protection — lightweight cookie check
  const isCustomerApi = pathname.startsWith('/api/customer');

  if (isCustomerApi) {
    if (!request.cookies.has(CUSTOMER_TOKEN)) {
      return new NextResponse(JSON.stringify({ error: 'Nicht angemeldet.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // 4. Customer account pages (/konto/*) — redirect to login if no cookie
  const isKontoPage = pathname.startsWith('/konto');

  if (isKontoPage) {
    if (!request.cookies.has(CUSTOMER_TOKEN)) {
      const loginUrl = new URL('/anmelden', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|uploads|manifest.json|sitemap.xml|robots.txt).*)',
  ],
};
