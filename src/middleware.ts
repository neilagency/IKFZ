import { NextRequest, NextResponse } from 'next/server';
import { getCustomerSessionFromRequest } from '@/lib/customer-auth';
import { verifyAuth } from '@/lib/auth';

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

  // 2. Admin route protection (existing admin auth)
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminLogin = pathname === '/admin' && request.method === 'GET'; // admin login is the admin page itself
  const isAdminAuthApi = pathname === '/api/admin/auth'; // allow login/logout without token

  if ((isAdminPage || isAdminApi) && !isAdminLogin && !isAdminAuthApi) {
    const user = verifyAuth(request);
    if (!user) {
      if (isAdminApi) {
        return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // For admin pages, let them handle their own login flow
    }
  }

  // 3. Customer account route protection (/konto/*)
  const isKontoPage = pathname.startsWith('/konto');
  const isCustomerApi = pathname.startsWith('/api/customer');

  if (isKontoPage || isCustomerApi) {
    const session = getCustomerSessionFromRequest(request);
    if (!session) {
      if (isCustomerApi) {
        return new NextResponse(JSON.stringify({ error: 'Nicht angemeldet.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const loginUrl = new URL('/anmelden', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|uploads|manifest.json|sitemap.xml|robots.txt).*)',
  ],
};
