import { latestSnapshot } from "@/lib/zcg/snapshots-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

/**
 * Premium "treasury at a glance" projection for the landing page — the two
 * pools the ZCG spreadsheet tracks: the operating (Coinbase) balance and the
 * ZIP-1016 Lockbox / Coinholder pool. Public, read from the latest snapshot.
 */

function PoolCard({
  name,
  tag,
  zec,
  usd,
  sub,
}: {
  name: string;
  tag: string;
  zec: string;
  usd: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-sm ring-1 ring-inset ring-stone-900/5">
      <span
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
          {name}
        </p>
        <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/20">
          {tag}
        </span>
      </div>
      <p className="relative mt-2 text-3xl font-bold tracking-tight tnum">
        <span className="bg-gradient-to-br from-amber-700 to-amber-500 bg-clip-text text-transparent">
          {zec}
        </span>
        <span className="ml-1.5 text-base font-medium text-stone-400">ZEC</span>
      </p>
      <p className="relative mt-1 text-sm text-stone-500 tnum">
        ≈ {usd}
        {sub ? <span className="text-stone-400"> · {sub}</span> : null}
      </p>
    </div>
  );
}

export async function TreasuryOverview() {
  const [op, lock] = await Promise.all([
    latestSnapshot("zcg_operating"),
    latestSnapshot("lockbox_coinholder"),
  ]);
  if (!op && !lock) return null;

  const height = op?.blockHeight ?? lock?.blockHeight ?? null;
  const priceCents = op?.zecusdPriceCents ?? lock?.zecusdPriceCents ?? null;

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-700">
          Treasury at a glance
        </h2>
        <p className="text-xs text-stone-400 tnum">
          {height != null
            ? `block ${Number(height).toLocaleString("en-US")}`
            : null}
          {priceCents != null ? ` · ZEC ${formatUsdCents(priceCents)}` : null}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {op ? (
          <PoolCard
            name="ZCG operating"
            tag="Coinbase address"
            zec={formatZec(op.zecBalanceZat ?? 0n, { symbol: false })}
            usd={formatUsdCents(op.usdTotalHoldingsCents ?? 0n, {
              compact: true,
            })}
            sub={
              op.usdCashBalanceCents != null
                ? `${formatUsdCents(op.usdCashBalanceCents, { compact: true })} cash`
                : undefined
            }
          />
        ) : null}
        {lock ? (
          <PoolCard
            name="Lockbox · Coinholder"
            tag="ZIP-1016 pool"
            zec={formatZec(lock.zecBalanceZat ?? 0n, { symbol: false })}
            usd={formatUsdCents(lock.usdTotalHoldingsCents ?? 0n, {
              compact: true,
            })}
          />
        ) : null}
      </div>
    </section>
  );
}
