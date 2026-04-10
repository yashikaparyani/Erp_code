import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, applyFrappeCookies, applySessionContextCookies, clearCachedServiceSession, loginToFrappe } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required.' },
        { status: 400 },
      );
    }

    const session = await loginToFrappe(username, password);
    clearCachedServiceSession();

    const contextResponse = await fetch(`${FRAPPE_URL}/api/method/gov_erp.api.get_session_context`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: session.cookie,
        'X-Frappe-CSRF-Token': session.csrfToken,
      },
      cache: 'no-store',
    });
    const contextPayload = await contextResponse.json().catch(() => ({}));

    if (!contextResponse.ok) {
      throw new Error(contextPayload?.message || contextPayload?.exception || 'Failed to load user session context.');
    }

    const context = contextPayload?.message ?? contextPayload;
    const response = NextResponse.json({
      success: true,
      data: context.data,
      message: 'Login successful',
    });

    applyFrappeCookies(response, session);
    applySessionContextCookies(response, context.data);
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 },
    );
  }
}
