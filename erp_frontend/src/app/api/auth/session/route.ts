import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, applySessionContextCookies } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!request.cookies.get('sid')?.value) {
    return NextResponse.json(
      { success: false, message: 'Unauthenticated' },
      { status: 401 },
    );
  }

  try {
    const response = await fetch(`${FRAPPE_URL}/api/method/gov_erp.api.get_session_context`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: request.headers.get('cookie') || '',
        'X-Frappe-CSRF-Token': request.cookies.get('frappe_csrf_token')?.value || '',
      },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || payload?.exception || 'Unauthenticated');
    }

    const result = payload?.message ?? payload;
    const nextResponse = NextResponse.json({
      success: true,
      data: result.data,
    });
    applySessionContextCookies(nextResponse, result.data);
    return nextResponse;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unauthenticated' },
      { status: 401 },
    );
  }
}
