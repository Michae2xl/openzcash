import "server-only";

/**
 * Live native-ZEC cross-chain DeFi liquidity from public APIs:
 *  - Midgard v2 (Maya Protocol, THORChain) — gives pool depth + APY.
 *  - GeckoTerminal (NEAR / Rhea Finance ZEC pool) — gives TVL + 24h volume.
 * Server-side fetch, cached ~5 min in-process. Venues that don't respond are
 * skipped, so the page degrades gracefully and keeps the last good snapshot.
 *
 * Note on NEAR: most ZEC liquidity on NEAR lives on NEAR Intents, but those
 * many pairs share one zec.omft.near vault, so their TVLs overlap and must NOT
 * be summed. We surface the clean Rhea Finance AMM pool (real, non-overlapping
 * depth + volume) instead.
 */

export type PoolStat = {
  venue: string;
  asset: string;
  url: string;
  zecDepth: number; // native ZEC in the pool (estimated for AMM pairs)
  priceUsd: number; // the venue's ZEC/USD
  tvlUsd: number; // total value locked, USD
  apyPct: number | null; // Midgard pools expose APY; GeckoTerminal pools don't
  volume24hUsd: number | null; // GeckoTerminal pools expose 24h volume
};

type MidgardSource = {
  kind: "midgard";
  venue: string;
  base: string;
  url: string;
};
type GeckoSource = {
  kind: "gecko";
  venue: string;
  asset: string;
  net: string;
  addr: string;
  url: string;
};
type Source = MidgardSource | GeckoSource;

const SOURCES: Source[] = [
  {
    kind: "midgard",
    venue: "Maya Protocol",
    base: "https://midgard.mayachain.info",
    url: "https://www.mayascan.org/pool/ZEC.ZEC",
  },
  {
    kind: "midgard",
    venue: "THORChain",
    base: "https://midgard.ninerealms.com",
    url: "https://thorchain.net/pools",
  },
  {
    kind: "gecko",
    venue: "NEAR · Rhea Finance",
    asset: "ZEC / wNEAR",
    net: "near",
    addr: "refv1-6065",
    url: "https://www.geckoterminal.com/near/pools/refv1-6065",
  },
];

const TTL_MS = 5 * 60_000;
let cache: { at: number; pools: PoolStat[] } | null = null;

async function fetchMidgard(s: MidgardSource): Promise<PoolStat | null> {
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
      volume24hUsd: null,
    };
  } catch {
    return null;
  }
}

type GeckoResp = {
  data?: {
    attributes?: {
      reserve_in_usd?: string;
      base_token_price_usd?: string;
      quote_token_price_usd?: string;
      volume_usd?: { h24?: string };
    };
    relationships?: { base_token?: { data?: { id?: string } } };
  };
};

async function fetchGecko(s: GeckoSource): Promise<PoolStat | null> {
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${s.net}/pools/${s.addr}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as GeckoResp;
    const a = j.data?.attributes;
    if (!a) return null;
    const baseId = j.data?.relationships?.base_token?.data?.id ?? "";
    const zecIsBase = baseId.toLowerCase().includes("zec");
    const priceUsd = Number(
      zecIsBase ? a.base_token_price_usd : a.quote_token_price_usd,
    );
    const tvlUsd = Number(a.reserve_in_usd);
    const vol = Number(a.volume_usd?.h24 ?? 0);
    if (!(priceUsd > 0) || !(tvlUsd > 0)) return null;
    return {
      venue: s.venue,
      asset: s.asset,
      url: s.url,
      zecDepth: tvlUsd / 2 / priceUsd, // estimate ZEC side of a balanced pair
      priceUsd,
      tvlUsd,
      apyPct: null,
      volume24hUsd: vol,
    };
  } catch {
    return null;
  }
}

function fetchSource(s: Source): Promise<PoolStat | null> {
  return s.kind === "midgard" ? fetchMidgard(s) : fetchGecko(s);
}

export async function getDefiPools(): Promise<PoolStat[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.pools;
  const results = await Promise.all(SOURCES.map(fetchSource));
  const pools = results
    .filter((p): p is PoolStat => p !== null)
    .sort((a, b) => b.tvlUsd - a.tvlUsd);
  if (pools.length === 0 && cache) return cache.pools; // keep last good snapshot
  cache = { at: now, pools };
  return pools;
}
