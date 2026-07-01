import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { currentLockboxZec } from "@/lib/zcash/lockbox-live";
import { currentZecUsdCents, zatToUsdCents } from "@/lib/pricing/live-price";
import {
  categoryTotals,
  grandTotal,
  recipientTotalsFromSheet,
} from "@/lib/zcg/totals-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";
import { TotalsCharts } from "../totals-charts";
import {
  TotalsTables,
  type CategoryRow,
  type RecipientRow,
} from "../totals/totals-tables";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coinholder Grants · OpenZcash" };

export default async function CoinholderPage() {
  const [lock, cats, recips, grand, liveCents] = await Promise.all([
    currentLockboxZec(),
    categoryTotals("coinholder"),
    recipientTotalsFromSheet("coinholder"),
    grandTotal("coinholder"),
    currentZecUsdCents(),
  ]);

  const total = grand[0]?.usdPaidToDateCents ?? 0n;
  const external = recips.filter((r) => !r.isInternalBucket);
  const totalNum = Number(total);
  const share = (cents: bigint) =>
    totalNum > 0 ? (Number(cents) / totalNum) * 100 : 0;

  const categoryRows: CategoryRow[] = cats.map((c) => ({
    key: `${c.pool}:${c.label}`,
    category: c.label,
    _usd: Number(c.usdPaidToDateCents),
    _pct: share(c.usdPaidToDateCents),
  }));

  const recipientRows: RecipientRow[] = external.map((r, i) => ({
    key: `${r.pool}:${r.label}`,
    rank: i + 1,
    recipient: r.label,
    _usd: Number(r.usdPaidToDateCents),
    _future: Number(r.usdFuturePipelineCents ?? 0n),
    _pct: share(r.usdPaidToDateCents),
  }));

  const topRecipients = recipientRows.slice(0, 10).map((r) => ({
    label: r.recipient,
    value: r._usd,
    display: formatUsdCents(r._usd, { compact: true }),
  }));
  const byClassification = categoryRows.map((c) => ({
    label: c.category,
    value: c._usd,
    display: formatUsdCents(c._usd, { compact: true }),
  }));

  const zec = lock?.zat ?? 0n;
  const priceCents = liveCents ?? lock?.snap?.zecusdPriceCents ?? null;
  const holdings =
    priceCents != null
      ? zatToUsdCents(zec, priceCents)
      : (lock?.snap?.usdTotalHoldingsCents ?? 0n);
  const receivables = lock?.snap?.zecReceivablesZat ?? 0n;

  return (
    <>
      <PageHeader
        title="Coinholder Grants"
        subtitle="The FPF-run Coinholder Grants program, funded from the ZIP-1016 Lockbox pool. Balances and totals mirror the ZCG public spreadsheet."
      />

      {/* Two separate funding pools — make it obvious which one this is. */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-1.5">
        <Link
          href="/zcg/totals"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-white hover:text-stone-900"
        >
          ← ZCG grants pool
        </Link>
        <span className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/25">
          Coinholder grants pool
        </span>
        <span className="px-1 text-xs text-stone-500">
          Two separate pools. You&apos;re viewing the{" "}
          <span className="font-medium text-stone-700">Coinholder</span> pool.
        </span>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Current ZEC balance"
          value={formatZec(zec, { symbol: false })}
          sub="Lockbox · ZIP-1016 pool"
        />
        <Stat
          label="USD value of holdings"
          value={formatUsdCents(holdings, { compact: true })}
          sub={liveCents != null ? "at live price" : "at the day's price"}
        />
        <Stat
          label="USD value paid out to date"
          value={formatUsdCents(total, { compact: true })}
          sub="to recipients"
        />
        <Stat
          label="ZEC receivables"
          value={formatZec(receivables, { symbol: false })}
          sub="pending to the pool"
        />
      </section>

      <TotalsCharts
        recipients={topRecipients}
        classifications={byClassification}
        format={(v) => formatUsdCents(v, { compact: true })}
      />

      <TotalsTables categoryRows={categoryRows} recipientRows={recipientRows} />

      {total > 0n ? (
        <Card className="mt-6 flex items-center justify-between gap-3 border-emerald-500/20 bg-emerald-500/[0.05]">
          <p className="text-sm text-emerald-800/80">
            Coinholder Grants grand total:{" "}
            <span className="font-medium text-emerald-800 tnum">
              {formatUsdCents(total)}
            </span>{" "}
            paid out to date.
          </p>
          <Badge tone="emerald">Imported</Badge>
        </Card>
      ) : null}
    </>
  );
}
