import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, applyFrappeCookies, applySessionContextCookies, clearCachedServiceSession, loginToFrappe } from '../../_lib/frappe';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// 5 login attempts per IP per 60-second window
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
        },
      );
    }

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
