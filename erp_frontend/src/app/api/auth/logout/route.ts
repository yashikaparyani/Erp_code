import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, clearCachedServiceSession, clearFrappeCookies } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';

    if (cookieHeader) {
      await fetch(`${FRAPPE_URL}/api/method/gov_erp.api.logout_current_session`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookieHeader,
          'X-Frappe-CSRF-Token': request.cookies.get('frappe_csrf_token')?.value || '',
        },
        cache: 'no-store',
      }).catch(() => null);
    }
  } finally {
    clearCachedServiceSession();
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });
  clearFrappeCookies(response);
  return response;
}
