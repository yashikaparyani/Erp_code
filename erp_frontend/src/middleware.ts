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
    return null;
  }

  return allowedPrimaryRoles.includes(primaryRole);
}

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
    if (gate.match(pathname)) {
      const allowed = hasAllowedRole(request, gate.roles);
      if (allowed === false) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
