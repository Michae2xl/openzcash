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
  // Keep anyone with ecosystem lines, ranked by that money only. A recipient
  // whose ledger is PURELY internal (the ZCG bucket, discretionary budget)
  // stays out; someone who both maintains a funded project and draws a
  // committee stipend belongs here, counted by their grant total.
  const external = all
    .filter((r) => r.externalUsdCents > 0n || r.externalZecZat > 0n)
    .sort((a, b) =>
      b.externalUsdCents > a.externalUsdCents
        ? 1
        : b.externalUsdCents < a.externalUsdCents
          ? -1
          : 0,
    );
  const grandTotal = external.reduce((s, r) => s + r.externalUsdCents, 0n);
  const maxUsd = external.reduce(
    (m, r) => (r.externalUsdCents > m ? r.externalUsdCents : m),
    0n,
  );

  const rows: RecipientRow[] = external.map((r, i) => ({
    rank: i + 1,
    recipientKey: r.recipientKey,
    recipient: r.recipientName,
    grantCount: r.grantCount,
    paymentCount: r.paymentCount,
    lastPaid: r.lastPaid ?? "",
    _usd: Number(r.externalUsdCents),
    _zec: Number(r.externalZecZat),
  }));

  return (
    <>
      <PageHeader
        title="Recipients"
        subtitle="How much each organization or individual has received from ZCG, summing every grant, milestone and payment. Committee stipends and internal operating buckets are excluded, so a committee member who also maintains a funded project is counted by their grant total only."
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
