import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const path = request.nextUrl.pathname;

  const isAdminRoute = path.startsWith('/admin');
  const isStaffRoute = path.startsWith('/staff');
  const isAuthRoute = path === '/login' || path === '/signup';

  // 1. Redirect root to login
  if (path === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Protect Dashboard Routes
  if ((isAdminRoute || isStaffRoute) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Prevent logged-in users from visiting login/signup
  if (isAuthRoute && token) {
    // We don't know the role here easily without decoding the JWT, 
    // but we can just let them through or pick a default.
    // For now, just let them be.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
