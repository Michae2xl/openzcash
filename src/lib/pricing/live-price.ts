import "server-only";

/**
 * Live ZEC→USD price oracle.
 *
 * Single source of truth for the *current* market price, used to value the
 * treasury (Lockbox/Coinholder pool, viewing-key balances) in USD. Fetched from
 * CoinGecko (free, no API key) and cached in-process for ~10 min so page loads
 * don't hammer the endpoint. Callers should fall back to the spreadsheet's
 * recorded price when this returns null (cold cache + feed unavailable).
 */

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd";
const TTL_MS = 10 * 60_000; // 10 minutes
const ZATS_PER_ZEC = 100_000_000n;

let cache: { cents: number; at: number } | null = null;

/**
 * Current ZEC price in integer USD cents, or null if the feed is unavailable
 * and nothing has ever been cached. Cached ~10 min in-process.
 */
export async function currentZecUsdCents(): Promise<number | null> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.cents;

  try {
    const res = await fetch(COINGECKO_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { zcash?: { usd?: number } };
      const usd = json?.zcash?.usd;
      if (typeof usd === "number" && usd > 0) {
        cache = { cents: Math.round(usd * 100), at: now };
        return cache.cents;
      }
    }
  } catch {
    // network/timeout/parse — fall through to the last cached value (or null)
  }
  return cache?.cents ?? null;
}

/** USD value (integer cents) of a zatoshi amount at a given price in cents/ZEC. */
export function zatToUsdCents(
  zat: bigint,
  priceCents: number | bigint,
): bigint {
  const cents =
    typeof priceCents === "bigint"
      ? priceCents
      : BigInt(Math.round(priceCents));
  // (zat * cents) / 1e8, rounded to nearest cent.
  return (zat * cents + ZATS_PER_ZEC / 2n) / ZATS_PER_ZEC;
}
