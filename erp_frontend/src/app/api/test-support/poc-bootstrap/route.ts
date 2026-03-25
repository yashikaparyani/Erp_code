import { NextRequest, NextResponse } from 'next/server';
import { FRAPPE_URL, loginToFrappe } from '../../_lib/frappe';

export const dynamic = 'force-dynamic';

const isLocalRequest = (request: NextRequest) => {
  const host = request.headers.get('host') || '';
  return host.includes('localhost') || host.includes('127.0.0.1') || host.includes('dev.localhost');
};

async function callPocMethod(method: string, args: Record<string, string> = {}) {
  const username = process.env.FRAPPE_USERNAME || 'Administrator';
  const password = process.env.FRAPPE_PASSWORD || 'admin';
  const session = await loginToFrappe(username, password);
  const body = new URLSearchParams();
  Object.entries(args).forEach(([key, value]) => body.set(key, value));

  const response = await fetch(`${FRAPPE_URL}/api/method/gov_erp.poc_setup.${method}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookie,
      'X-Frappe-CSRF-Token': session.csrfToken,
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.exception || 'POC bootstrap failed');
  }
  return payload?.message ?? payload;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' || !isLocalRequest(request)) {
    return NextResponse.json({ success: false, message: 'Unavailable' }, { status: 404 });
  }

  try {
    const result = await callPocMethod('get_poc_credential_status');
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch POC status' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' || !isLocalRequest(request)) {
    return NextResponse.json({ success: false, message: 'Unavailable' }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || '').trim();
    if (!password) {
      return NextResponse.json({ success: false, message: 'password is required' }, { status: 400 });
    }
    const result = await callPocMethod('set_poc_password', { password, reprovision: '1' });
    return NextResponse.json({ success: true, data: result, message: 'POC password configured' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to configure POC password' },
      { status: 500 },
    );
  }
}
