import { Card, PageHeader, Stat } from "@/components/ui";
import { recipientTotals } from "@/lib/zcg/disbursements-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { RecipientsTable, type RecipientRow } from "./recipients-table";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import { Synced } from "@/components/synced";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recipients ZCG · OpenZcash" };

export default async function RecebedoresPage() {
  const all = await cached("recipientTotals", LEDGER_TTL_MS, () =>
    recipientTotals(),
  );
  const external = all.filter((r) => !r.isInternal);
  const grandTotal = external.reduce((s, r) => s + r.usdCents, 0n);
  const maxUsd = external.reduce(
    (m, r) => (r.usdCents > m ? r.usdCents : m),
    0n,
  );

  const rows: RecipientRow[] = external.map((r, i) => ({
    rank: i + 1,
    recipientKey: r.recipientKey,
    recipient: r.recipientName,
    grantCount: r.grantCount,
    paymentCount: r.paymentCount,
    lastPaid: r.lastPaid ?? "",
    _usd: Number(r.usdCents),
    _zec: Number(r.zecZat),
  }));

  return (
    <>
      <PageHeader
        title="Recipients"
        subtitle="How much each organization or individual has received from ZCG, summing every grant, milestone and payment. ZCG internal buckets are listed separately."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="Recipients"
          value={String(external.length)}
          sub="orgs and individuals"
        />
        <Stat
          label="Total distributed"
          value={formatUsdCents(grandTotal, { compact: true })}
          sub="USD to third parties"
          tone="warn"
        />
        <Stat
          label="Top recipient"
          value={formatUsdCents(maxUsd, { compact: true })}
          sub={external[0]?.recipientName ?? "n/a"}
        />
      </section>

      <Card className="p-4">
        <RecipientsTable rows={rows} />
      </Card>

      <Synced className="mt-4" />
    </>
  );
}
