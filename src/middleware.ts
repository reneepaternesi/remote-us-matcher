import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appPassword = process.env.APP_PASSWORD;

  // If no password configured in local dev, allow
  if (!appPassword) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('APP_PASSWORD is not set in production');
    }
    return NextResponse.next();
  }

  const expectedToken = await hashPassword(appPassword);
  const sessionToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = sessionToken && sessionToken === expectedToken;

  // If user is accessing /login
  if (pathname === '/login') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Allow auth API routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // If unauthenticated, block and redirect to login
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/postulaciones',
    '/postulaciones/:path*',
    '/scraper',
    '/scraper/:path*',
    '/perfil',
    '/perfil/:path*',
    '/login',
    '/api/:path*',
  ],
};

