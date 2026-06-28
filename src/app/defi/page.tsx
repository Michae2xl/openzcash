import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { getDefiPools } from "@/lib/defi/pools";
import { mayaTransfers } from "@/lib/zcg/snapshots-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZEC DeFi liquidity · OpenZcash" };

function usd0(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function zec(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default async function DefiPage() {
  const [pools, transfers] = await Promise.all([
    getDefiPools(),
    mayaTransfers(),
  ]);
  const totalZec = pools.reduce((s, p) => s + p.zecDepth, 0);
  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0);
  const lpZec = transfers.reduce((s, t) => s + (t.zecTransferredZat ?? 0n), 0n);
  const lpUsd = transfers.reduce((s, t) => s + (t.amountUsdCents ?? 0n), 0n);

  return (
    <>
      <PageHeader
        title="ZEC DeFi liquidity"
        subtitle="Where native ZEC trades cross-chain. Live pool depth, value locked and yield from public Midgard APIs (Maya Protocol, THORChain), refreshed every few minutes."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="Pools live"
          value={String(pools.length)}
          sub="cross-chain venues"
        />
        <Stat
          label="ZEC in pools"
          value={zec(totalZec)}
          sub="native ZEC liquidity"
        />
        <Stat
          label="Total value locked"
          value={usd0(totalTvl)}
          sub="both sides · live"
        />
      </section>

      {pools.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-600">
            No pool data available right now — the venues&rsquo; APIs may be
            momentarily unreachable. This refreshes automatically.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pools.map((p) => (
            <a
              key={p.venue}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Card interactive>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
                      {p.venue}
                    </p>
                    <p className="mt-1 text-sm font-medium text-stone-900">
                      {p.asset} pool
                    </p>
                  </div>
                  <Badge tone="emerald">
                    {p.apyPct != null
                      ? `${p.apyPct.toFixed(2)}% APY`
                      : p.volume24hUsd != null
                        ? `${usd0(p.volume24hUsd)} · 24h`
                        : p.asset}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-500">ZEC depth</p>
                    <p className="truncate text-sm font-semibold text-stone-900 tnum">
                      {zec(p.zecDepth)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-500">TVL</p>
                    <p className="truncate text-sm font-semibold text-stone-900 tnum">
                      {usd0(p.tvlUsd)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-stone-500">ZEC price</p>
                    <p className="truncate text-sm font-semibold text-stone-900 tnum">
                      {usd0(p.priceUsd)}
                    </p>
                  </div>
                </div>
              </Card>
            </a>
          ))}
        </div>
      )}

      {transfers.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-1 text-sm font-semibold text-stone-700">
            ZCG&rsquo;s Maya LP contributions
          </h2>
          <p className="mb-4 text-xs text-stone-600">
            ZEC the Zcash Community Grants treasury contributed to the Maya pool
            for ecosystem liquidity. CACAO is tracked in its own unit (never
            added to ZEC).
          </p>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat
              label="ZEC contributed"
              value={formatZec(lpZec, { symbol: false })}
              sub="to the Maya LP"
            />
            <Stat
              label="Cost in USD"
              value={formatUsdCents(lpUsd, { compact: true })}
              sub="at contribution date"
            />
            <Stat
              label="Contributions"
              value={String(transfers.length)}
              sub="transfers"
            />
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="tbl-head text-[11px] uppercase tracking-wider text-stone-600">
                <tr className="border-b border-stone-200">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 text-right font-medium">USD</th>
                  <th className="px-4 py-3 text-right font-medium">ZEC</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr
                    key={t.id}
                    className="tbl-row border-b border-stone-200 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-stone-900">
                      {t.project ?? "·"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                      {formatUsdCents(t.amountUsdCents)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                      {t.zecTransferredZat != null
                        ? formatZec(t.zecTransferredZat, { symbol: false })
                        : "·"}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right text-xs text-stone-600 sm:table-cell tnum">
                      {t.transferredAt ?? "·"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      ) : null}

      <p className="mt-6 text-xs text-stone-500">
        Data: Maya &amp; THORChain (Midgard v2) and NEAR / Rhea Finance
        (GeckoTerminal). NEAR Intents holds further large cross-chain ZEC
        liquidity across many bridged pairs, not summed here to avoid
        double-counting their shared vault.
      </p>
    </>
  );
}
