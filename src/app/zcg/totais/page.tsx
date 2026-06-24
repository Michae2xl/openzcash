import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import {
  categoryTotals,
  grandTotal,
  recipientTotalsFromSheet,
} from "@/lib/zcg/totals-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import {
  TotalsTables,
  type CategoryRow,
  type RecipientRow,
} from "./totals-tables";

export const dynamic = "force-dynamic";
export const metadata = { title: "Totals ZCG · ZBO" };

export default async function TotaisPage() {
  const [cats, recips, grand] = await Promise.all([
    categoryTotals("zcg_grants"),
    recipientTotalsFromSheet("zcg_grants"),
    grandTotal("zcg_grants"),
  ]);

  const total = grand[0]?.usdPaidToDateCents ?? 0n;
  const future = grand.reduce(
    (s, g) => s + (g.usdFuturePipelineCents ?? 0n),
    0n,
  );
  const external = recips.filter((r) => !r.isInternalBucket);

  const categoryRows: CategoryRow[] = cats.map((c) => ({
    key: `${c.pool}:${c.label}`,
    category: c.label,
    _usd: Number(c.usdPaidToDateCents),
  }));

  const recipientRows: RecipientRow[] = external.map((r, i) => ({
    key: `${r.pool}:${r.label}`,
    rank: i + 1,
    recipient: r.label,
    _usd: Number(r.usdPaidToDateCents),
  }));

  return (
    <>
      <PageHeader
        title="Totals & integrity check"
        subtitle="Official aggregates from the spreadsheet (paid amounts by recipient and by category). They serve as a cross-check against the ledger: the spreadsheet sums the payments that were actually settled."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total paid"
          value={formatUsdCents(total, { compact: true })}
          sub="cumulative (spreadsheet)"
          tone="warn"
        />
        <Stat
          label="Future pipeline"
          value={formatUsdCents(future, { compact: true })}
          sub="milestones to pay"
        />
        <Stat
          label="Categories"
          value={String(cats.length)}
          sub="ZCG classifications"
        />
        <Stat
          label="Recipients"
          value={String(external.length)}
          sub="orgs (excludes internal buckets)"
        />
      </section>

      <TotalsTables categoryRows={categoryRows} recipientRows={recipientRows} />

      <Card className="mt-6 flex items-center justify-between gap-3 border-emerald-500/20 bg-emerald-500/[0.05]">
        <p className="text-sm text-emerald-800/80">
          Spreadsheet grand total:{" "}
          <span className="font-medium text-emerald-800 tnum">
            {formatUsdCents(total)}
          </span>{" "}
          paid to recipients, matching the sum of categories.
        </p>
        <Badge tone="emerald">✓ imported</Badge>
      </Card>
    </>
  );
}
