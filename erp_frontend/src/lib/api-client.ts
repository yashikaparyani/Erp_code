/**
 * Thin fetch wrapper for Next.js client-side API calls.
 *
 * Throws an Error when:
 *  - the network request itself fails
 *  - the server responds with a non-2xx status
 *  - the parsed JSON contains `{ success: false }`
 *
 * This makes it safe to use inside try/catch blocks or with Promise.catch()
 * without silently swallowing server-side error messages.
 */
export async function apiFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const payload = await r.json().catch(() => ({}));
  if (!r.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed (HTTP ${r.status})`);
  }
  return payload;
}
