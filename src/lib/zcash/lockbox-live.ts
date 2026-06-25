/**
 * THE single source for the live Lockbox (deferred Dev Fund) total.
 *
 * Every screen that shows the "Lockbox" figure (landing, /zcg, /zcg/coinholder,
 * /lockbox) MUST read it from here so they all agree. It anchors to the latest
 * `lockbox_coinholder` snapshot (the spreadsheet balance) and adds the protocol
 * accrual (0.1875 ZEC per block) up to the current chain tip — the exact same
 * math the /lockbox live feed uses on the client. The chain tip is cached per
 * server instance so this doesn't hit lightwalletd on every render.
 */
import "server-only";
import { latestSnapshot } from "@/lib/zcg/snapshots-repo";
import { getCurrentHeight } from "@/lib/zcash/real/lwd/lwd-client";
import { LOCKBOX_ZEC_PER_BLOCK, THIRD_HALVING_HEIGHT } from "./lockbox";

const LWD_URL = process.env.LWD_URL ?? "zec.rocks:443";
const TIP_TTL_MS = 60_000;
let tipCache = { height: 0, at: 0 };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("chain-tip timeout")), ms),
    ),
  ]);
}

/** Current Zcash chain tip, cached per instance (60s) to spare lightwalletd. */
async function cachedChainTip(): Promise<number> {
  const now = Date.now();
  if (tipCache.height > 0 && now - tipCache.at < TIP_TTL_MS) {
    return tipCache.height;
  }
  try {
    const h = await withTimeout(getCurrentHeight(LWD_URL), 5_000);
    if (h > 0) tipCache = { height: h, at: now };
    return h > 0 ? h : tipCache.height;
  } catch {
    return tipCache.height;
  }
}

/**
 * Live Lockbox total = spreadsheet baseline + protocol accrual since. Returns
 * null only when no snapshot exists yet. `snap` is the raw snapshot row so
 * callers can read the matching USD/price without a second query.
 */
export async function currentLockboxZec() {
  const snap = await latestSnapshot("lockbox_coinholder");
  if (!snap || snap.zecBalanceZat == null) return null;

  const baselineZat = BigInt(snap.zecBalanceZat);
  const baselineHeight = snap.blockHeight ? Number(snap.blockHeight) : 0;
  const tip = await cachedChainTip();
  const eff = Math.min(tip || baselineHeight, THIRD_HALVING_HEIGHT);
  const blocks = baselineHeight > 0 ? Math.max(0, eff - baselineHeight) : 0;
  const accruedZat = BigInt(Math.round(blocks * LOCKBOX_ZEC_PER_BLOCK * 1e8));

  return {
    zat: baselineZat + accruedZat,
    baselineZat,
    baselineHeight,
    height: tip || baselineHeight,
    snap,
  };
}
