import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LOGIN_PATH = '/login';

function hasPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function hasAllowedRole(request: NextRequest, allowedPrimaryRoles: string[]) {
  const primaryRole = request.cookies.get('app_role')?.value || '';
  const rawRoles = request.cookies.get('app_roles')?.value || '';
  const roleSet = new Set(rawRoles.split('|').filter(Boolean));

  if (roleSet.has('System Manager')) {
    return true;
  }

  if (!primaryRole) {
    return false;
  }

  return allowedPrimaryRoles.includes(primaryRole);
}

/**
 * Edge middleware — authentication gate plus coarse protection for
 * high-risk route families.
 *
 * Runtime RBAC truth still lives in PermissionContext/backend APIs, but we
 * keep a small server-side guard here so sensitive screens are not exposed
 * purely through client-side checks during initial page load.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sid = request.cookies.get('sid')?.value;

  if (pathname === LOGIN_PATH) {
    // Always allow the login route. A stale `sid` cookie can exist even when
    // the backend session has expired, and hard-redirecting away from /login
    // traps the user on a blank shell at `/`.
    return NextResponse.next();
  }

  if (!sid) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (pathname && pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  const gatedRoutes: Array<{ match: (pathname: string) => boolean; roles: string[] }> = [
    {
      match: (value) => hasPrefix(value, '/settings/operations'),
      roles: ['Director'],
    },
    {
      match: (value) => hasPrefix(value, '/settings/anda-import'),
      roles: ['Director'],
    },
    {
      match: (value) => hasPrefix(value, '/finance/costing-queue'),
      roles: ['Director', 'Accounts'],
    },
    {
      match: (value) => hasPrefix(value, '/projects'),
      roles: ['Director', 'Project Head'],
    },
    {
      match: (value) => hasPrefix(value, '/project-head'),
      roles: ['Director', 'Project Head'],
    },
    {
      match: (value) => value === '/settings' || hasPrefix(value, '/settings'),
      roles: ['Director', 'Department Head'],
    },
    {
      match: (value) => hasPrefix(value, '/pre-sales/settings'),
      roles: ['Director', 'Department Head'],
    },
    {
      match: (value) => hasPrefix(value, '/master-data'),
      roles: ['Director', 'Department Head', 'Project Head'],
    },
  ];

  for (const gate of gatedRoutes) {
    if (gate.match(pathname) && !hasAllowedRole(request, gate.roles)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
