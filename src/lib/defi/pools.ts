import "server-only";

/**
 * Live native-ZEC cross-chain DeFi liquidity, read from public Midgard v2 APIs
 * (Maya Protocol and THORChain). Server-side fetch, cached ~5 min in-process.
 * Venues that don't respond are skipped, so the page degrades gracefully and
 * keeps the last good snapshot if every source is momentarily unreachable.
 */

export type PoolStat = {
  venue: string;
  asset: string;
  url: string;
  zecDepth: number; // native ZEC currently in the pool
  priceUsd: number; // the venue's ZEC/USD oracle
  tvlUsd: number; // two-sided value locked, USD
  apyPct: number; // pool APY (%)
};

type Source = { venue: string; base: string; url: string };

const SOURCES: Source[] = [
  {
    venue: "Maya Protocol",
    base: "https://midgard.mayachain.info",
    url: "https://www.mayascan.org/pool/ZEC.ZEC",
  },
  {
    venue: "THORChain",
    base: "https://midgard.ninerealms.com",
    url: "https://thorchain.net/pools",
  },
];

const TTL_MS = 5 * 60_000;
let cache: { at: number; pools: PoolStat[] } | null = null;

async function fetchPool(s: Source): Promise<PoolStat | null> {
  try {
    const res = await fetch(`${s.base}/v2/pool/ZEC.ZEC`, {
      headers: { accept: "application/json", "x-client-id": "openzcash" },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, string>;
    const zecDepth = Number(j.assetDepth) / 1e8;
    const priceUsd = Number(j.assetPriceUSD);
    if (!(zecDepth > 0) || !(priceUsd > 0)) return null;
    const apy = Number(j.poolAPY ?? j.annualPercentageRate ?? 0);
    return {
      venue: s.venue,
      asset: "ZEC.ZEC",
      url: s.url,
      zecDepth,
      priceUsd,
      tvlUsd: zecDepth * priceUsd * 2,
      apyPct: apy * 100,
    };
  } catch {
    return null;
  }
}

export async function getDefiPools(): Promise<PoolStat[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.pools;
  const results = await Promise.all(SOURCES.map(fetchPool));
  const pools = results.filter((p): p is PoolStat => p !== null);
  if (pools.length === 0 && cache) return cache.pools; // keep last good snapshot
  cache = { at: now, pools };
  return pools;
}
