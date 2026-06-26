/**
 * Rate-limit in-memory por chave (ex.: IP) — anti-brute-force no login.
 * Janela deslizante simples. MVP single-instance; em produção multi-instância,
 * trocar por um store compartilhado (Redis/Upstash).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

// Global ceiling across ALL keys per window. The per-key bucket is keyed on the
// (client-spoofable) X-Forwarded-For, so a rotating forged header would mint a
// fresh bucket on every attempt and defeat the throttle. This ceiling caps the
// TOTAL attempt rate regardless of key, so IP rotation can't bypass it.
const GLOBAL_WINDOW_MS = 15 * 60_000;
const GLOBAL_MAX = 100;
let globalCount = 0;
let globalResetAt = 0;

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly retryAfterSec: number;
}

/** Conta uma tentativa para `key`. Retorna se está dentro do limite. */
export function hitRateLimit(key: string): RateLimitResult {
  const now = Date.now();

  if (globalResetAt <= now) {
    globalCount = 0;
    globalResetAt = now + GLOBAL_WINDOW_MS;
  }
  globalCount += 1;
  if (globalCount > GLOBAL_MAX) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((globalResetAt - now) / 1000),
    };
  }

  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (b.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  b.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Zera o contador (chamar após login bem-sucedido). */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
