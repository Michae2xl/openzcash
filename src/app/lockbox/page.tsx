import { PageHeader } from "@/components/ui";
import { LockboxLiveFeed } from "@/components/lockbox-live-feed";
import { zecUnitPrice } from "@/lib/pricing/price-oracle";
import { getCurrentHeight } from "@/lib/zcash/real/lwd/lwd-client";
import { latestSnapshot } from "@/lib/zcg/snapshots-repo";

export const metadata = { title: "Lockbox · live funding · OpenZcash" };
export const dynamic = "force-dynamic";

const LWD_URL = process.env.LWD_URL ?? "zec.rocks:443";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("t")), ms)),
  ]);
}

export default async function TransacoesPage() {
  // Initial chain tip for SSR; the client refines it by polling /api/chain-tip.
  let initialHeight = 0;
  try {
    initialHeight = await withTimeout(getCurrentHeight(LWD_URL), 5_000);
  } catch {
    initialHeight = 0;
  }
  const zecUsd = zecUnitPrice("USD");

  // Anchor the live total to the spreadsheet's real Lockbox balance so it
  // agrees with the other screens; live blocks only add to it from there.
  const snap = await latestSnapshot("lockbox_coinholder");
  const baselineZec = snap?.zecBalanceZat
    ? Number(snap.zecBalanceZat) / 1e8
    : 0;
  const baselineHeight = snap?.blockHeight ? Number(snap.blockHeight) : 0;

  return (
    <>
      <PageHeader
        title="Lockbox · live funding"
        subtitle="Real-time view of the Zcash deferred Dev Fund. Every block mined adds 0.1875 ZEC (12% of the block subsidy) to the in-protocol Lockbox. This is the protocol funding stream read straight from the chain tip, not viewing-key data."
      />
      <LockboxLiveFeed
        initialHeight={initialHeight}
        zecUsd={zecUsd}
        baselineZec={baselineZec}
        baselineHeight={baselineHeight}
      />
    </>
  );
}
