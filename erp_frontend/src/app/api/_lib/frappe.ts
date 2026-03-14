import { NextRequest, NextResponse } from 'next/server';

export const FRAPPE_URL = process.env.FRAPPE_URL || 'http://127.0.0.1:8000';
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;
const FRAPPE_USERNAME = process.env.FRAPPE_USERNAME || 'Administrator';
const FRAPPE_PASSWORD = process.env.FRAPPE_PASSWORD || 'admin';
const FRAPPE_CSRF_COOKIE = 'frappe_csrf_token';

type CookiePair = {
  name: string;
  value: string;
};

type SessionAuth = {
  cookie: string;
  csrfToken: string;
  cookies: CookiePair[];
};

let cachedSession: SessionAuth | null = null;

function extractServerMessage(result: any): string {
  try {
    if (result?._server_messages) {
      const parsed = JSON.parse(result._server_messages);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = JSON.parse(parsed[0]);
        return first.message || 'Backend request failed';
      }
    }
  } catch {
    return result?.exception || result?.exc_type || 'Backend request failed';
  }

  return result?.exception || result?.exc_type || result?.message || 'Backend request failed';
}

function getSetCookieHeaders(response: Response): string[] {
  const headersWithCookies = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof headersWithCookies.getSetCookie === 'function') {
    return headersWithCookies.getSetCookie();
  }

  const setCookie = response.headers.get('set-cookie');
  return setCookie ? [setCookie] : [];
}

function parseCookiePairs(setCookieHeaders: string[]): CookiePair[] {
  return setCookieHeaders
    .flatMap((header) => header.split(/,(?=[^;]+=)/))
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separator = cookie.indexOf('=');
      return {
        name: cookie.slice(0, separator),
        value: cookie.slice(separator + 1),
      };
    });
}

function buildCookieHeaderFromPairs(cookies: CookiePair[]): string {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

function getRequestCookieHeader(request?: NextRequest): string {
  return request?.headers.get('cookie') || '';
}

function hasFrappeSessionCookie(request?: NextRequest): boolean {
  return Boolean(request?.cookies.get('sid')?.value);
}

async function extractCsrfToken(cookieHeader: string): Promise<string> {
  const appResponse = await fetch(`${FRAPPE_URL}/app`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  });

  if (!appResponse.ok) {
    throw new Error(`Failed to load Frappe app shell (${appResponse.status}).`);
  }

  const appHtml = await appResponse.text();
  const csrfMatch = appHtml.match(/frappe\.csrf_token\s*=\s*"([^"]+)"/);
  const csrfToken = csrfMatch?.[1];

  if (!csrfToken) {
    throw new Error('Frappe did not return a CSRF token.');
  }

  return csrfToken;
}

export async function loginToFrappe(username: string, password: string): Promise<SessionAuth> {
  const loginBody = new URLSearchParams({
    usr: username,
    pwd: password,
  });

  const loginResponse = await fetch(`${FRAPPE_URL}/api/method/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: loginBody.toString(),
    cache: 'no-store',
  });

  const payload = await loginResponse.json().catch(() => ({}));
  if (!loginResponse.ok) {
    throw new Error(extractServerMessage(payload));
  }

  const cookies = parseCookiePairs(getSetCookieHeaders(loginResponse));
  const cookieHeader = buildCookieHeaderFromPairs(cookies);

  if (!cookieHeader) {
    throw new Error('Frappe login did not return a session cookie.');
  }

  const csrfToken = await extractCsrfToken(cookieHeader);
  return { cookie: cookieHeader, csrfToken, cookies };
}

export function clearCachedServiceSession() {
  cachedSession = null;
}

async function getServiceSessionAuth(): Promise<SessionAuth> {
  if (cachedSession) {
    return cachedSession;
  }

  cachedSession = await loginToFrappe(FRAPPE_USERNAME, FRAPPE_PASSWORD);
  return cachedSession;
}

export function applyFrappeCookies(response: NextResponse, session: SessionAuth) {
  for (const cookie of session.cookies) {
    response.cookies.set({
      name: cookie.name,
      value: cookie.value,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  response.cookies.set({
    name: FRAPPE_CSRF_COOKIE,
    value: session.csrfToken,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export function clearFrappeCookies(response: NextResponse) {
  for (const cookieName of ['sid', 'system_user', 'full_name', 'user_id', 'user_image', FRAPPE_CSRF_COOKIE]) {
    response.cookies.set({
      name: cookieName,
      value: '',
      expires: new Date(0),
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
}

async function getAuthHeaders(request?: NextRequest, needsCsrf = false): Promise<Record<string, string>> {
  if (FRAPPE_API_KEY && FRAPPE_API_SECRET) {
    return {
      Authorization: `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
    };
  }

  if (request) {
    if (!hasFrappeSessionCookie(request)) {
      throw new Error('Authentication required.');
    }

    const headers: Record<string, string> = {
      Cookie: getRequestCookieHeader(request),
    };

    if (needsCsrf) {
      const csrfToken = request.cookies.get(FRAPPE_CSRF_COOKIE)?.value || request.headers.get('x-frappe-csrf-token');
      if (!csrfToken) {
        throw new Error('Missing Frappe CSRF token for authenticated session.');
      }
      headers['X-Frappe-CSRF-Token'] = csrfToken;
    }

    return headers;
  }

  const serviceSession = await getServiceSessionAuth();
  const headers: Record<string, string> = {
    Cookie: serviceSession.cookie,
  };
  if (needsCsrf) {
    headers['X-Frappe-CSRF-Token'] = serviceSession.csrfToken;
  }
  return headers;
}

export async function callFrappeMethod<T = any>(
  method: string,
  args?: Record<string, any>,
  request?: NextRequest,
): Promise<T> {
  const authHeaders = await getAuthHeaders(request, true);
  const body = new URLSearchParams();

  Object.entries(args || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  });

  const response = await fetch(`${FRAPPE_URL}/api/method/gov_erp.api.${method}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...authHeaders,
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractServerMessage(payload));
  }

  const message = payload?.message ?? payload;
  if (message?.success === false) {
    throw new Error(message.message || 'Backend operation failed');
  }

  return message;
}

export async function callRawFrappeMethod<T = any>(
  method: string,
  request?: NextRequest,
  httpMethod: 'GET' | 'POST' = 'POST',
): Promise<T> {
  const authHeaders = await getAuthHeaders(request, httpMethod !== 'GET');
  const response = await fetch(`${FRAPPE_URL}/api/method/${method}`, {
    method: httpMethod,
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractServerMessage(payload));
  }

  return payload?.message ?? payload;
}

export async function uploadFrappeFile(
  formData: FormData,
  request?: NextRequest,
): Promise<any> {
  const authHeaders = await getAuthHeaders(request, true);
  const response = await fetch(`${FRAPPE_URL}/api/method/upload_file`, {
    method: 'POST',
    headers: {
      ...authHeaders,
    },
    body: formData,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractServerMessage(payload));
  }

  return payload;
}
