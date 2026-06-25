import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { currentLockboxZec } from "@/lib/zcash/lockbox-live";
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
export const metadata = { title: "Coinholder Grants · ZBO" };

export default async function CoinholderPage() {
  const [lock, cats, recips, grand] = await Promise.all([
    currentLockboxZec(),
    categoryTotals("coinholder"),
    recipientTotalsFromSheet("coinholder"),
    grandTotal("coinholder"),
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
  const holdings = lock?.snap?.usdTotalHoldingsCents ?? 0n;
  const receivables = lock?.snap?.zecReceivablesZat ?? 0n;

  return (
    <>
      <PageHeader
        title="Coinholder Grants"
        subtitle="The FPF-run Coinholder Grants program, funded from the ZIP-1016 Lockbox pool. Balances and totals mirror the ZCG public spreadsheet."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Current ZEC balance"
          value={formatZec(zec, { symbol: false })}
          sub="Lockbox · ZIP-1016 pool"
        />
        <Stat
          label="USD value of holdings"
          value={formatUsdCents(holdings, { compact: true })}
          sub="at the day's price"
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
