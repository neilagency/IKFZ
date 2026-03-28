import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. www → non-www 301 redirect
  if (hostname.startsWith('www.')) {
    const nonWwwHost = hostname.replace(/^www\./, '');
    return NextResponse.redirect(
      new URL(`${url.protocol}//${nonWwwHost}${url.pathname}${url.search}`),
      301
    );
  }

  // 2. Trailing slash enforcement (add trailing slash to paths without extension)
  const { pathname } = url;
  if (
    pathname !== '/' &&
    !pathname.endsWith('/') &&
    !pathname.includes('.') &&
    !pathname.startsWith('/api/')
  ) {
    url.pathname = `${pathname}/`;
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|uploads|manifest.json|sitemap.xml|robots.txt).*)',
  ],
};
