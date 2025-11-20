import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware for route protection
 * Checks for session cookie and redirects to login if missing
 * 
 * Note: We cannot use Firebase Admin SDK in Edge Runtime middleware,
 * so we only check for the presence of the session cookie here.
 * Actual verification happens in the API routes and server components.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login page and public assets
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Get the session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  // If no session cookie, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect root path to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Session cookie exists, allow access
  // Actual verification will happen in API routes and server components
  return NextResponse.next();
}

/**
 * Configure which routes should be protected by middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (login page)
     * - /api/auth/* (auth endpoints)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
