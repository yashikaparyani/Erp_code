import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LOGIN_PATH = '/login';

/**
 * Edge middleware — authentication gate only.
 *
 * All route-level authorisation is handled client-side by PermissionContext
 * (backend-driven, fail-closed) and RoleContext.hasAccess() as a loading
 * fallback.  Keeping a parallel cookie-role gate here caused conflicts
 * (cookie role could diverge from capability truth), so this layer now
 * only enforces "user is logged in".
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sid = request.cookies.get('sid')?.value;

  if (pathname === LOGIN_PATH) {
    if (sid) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!sid) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (pathname && pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
