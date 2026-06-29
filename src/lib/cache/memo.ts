import "server-only";

/**
 * In-process TTL memo for expensive read-only DB queries.
 *
 * The site runs as a single Railway instance, so a process-local cache is
 * enough to stop force-dynamic pages from re-querying Postgres on every click:
 * the first request after expiry pays the query, the rest are served from
 * memory. Mirrors the caching style of live-price.ts.
 *
 * Note: cached values lag DB writes by up to `ttlMs` (fine for the daily-import
 * data here). When admin write paths are re-enabled, clear with `invalidate`.
 */
type Entry = { value: unknown; at: number };

const store = new Map<string, Entry>();

/** Return the cached value for `key`, or compute it with `fn` and cache it. */
export async function cached<R>(
  key: string,
  ttlMs: number,
  fn: () => Promise<R>,
): Promise<R> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as R;
  const value = await fn();
  store.set(key, { value, at: now });
  return value;
}

/** Drop one key (exact) or every key sharing a prefix; no arg clears all. */
export function invalidate(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key === prefix || key.startsWith(`${prefix}:`)) store.delete(key);
  }
}

/** Shared TTL for the ZCG ledger pages — daily-import data, 10-minute freshness. */
export const LEDGER_TTL_MS = 10 * 60_000;
