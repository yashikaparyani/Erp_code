/**
 * Lightweight in-memory sliding-window rate limiter for Next.js API routes.
 *
 * NOT shared across workers in multi-instance deployments — for that, swap in
 * Redis or a proper distributed store. Sufficient for single-node deployments.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Evict expired entries every 60 s to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 60_000).unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check whether `key` is within its rate limit.
 *
 * @param key      Unique key (e.g. IP address, user ID).
 * @param limit    Maximum requests allowed within the window.
 * @param windowMs Window duration in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfterMs: 0,
  };
}
