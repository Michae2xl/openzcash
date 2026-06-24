/**
 * Live chain tip for the Incoming feed: returns the current Zcash block height
 * read from lightwalletd (GetLightdInfo). Read-only. Short server-side cache so
 * the client can poll every ~15s without hammering the upstream node.
 */
import { NextResponse } from "next/server";
import { getCurrentHeight } from "@/lib/zcash/real/lwd/lwd-client";

export const dynamic = "force-dynamic";

const LWD_URL = process.env.LWD_URL ?? "zec.rocks:443";
const CACHE_MS = 10_000;
const TIMEOUT_MS = 8_000;

let cache: { height: number; at: number } | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("chain-tip timeout")), ms),
    ),
  ]);
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ height: cache.height, cached: true });
  }
  try {
    const height = await withTimeout(getCurrentHeight(LWD_URL), TIMEOUT_MS);
    cache = { height, at: Date.now() };
    return NextResponse.json({ height });
  } catch {
    // Serve the last known height as stale rather than breaking the feed.
    if (cache) return NextResponse.json({ height: cache.height, stale: true });
    return NextResponse.json(
      { error: "chain tip unavailable" },
      { status: 503 },
    );
  }
}
