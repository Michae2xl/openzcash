import { Card, PageHeader, Stat } from "@/components/ui";
import { grantsSummary, listGrants } from "@/lib/zcg/grants-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { GrantsTable, type GrantTableRow } from "./grants-table";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import { Synced } from "@/components/synced";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grants ZCG · OpenZcash" };

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  cancelled: "Cancelled",
  open: "Open",
  keyholder_veto: "Veto",
  funds_returned: "Funds returned",
};

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export default async function GrantsPage() {
  const [grants, summary] = await Promise.all([
    cached("grants:list", LEDGER_TTL_MS, () => listGrants()),
    cached("grants:summary", LEDGER_TTL_MS, () => grantsSummary()),
  ]);

  const rows: GrantTableRow[] = grants.map((g) => ({
    grantKey: g.grantKey,
    grantee: g.grantee,
    category: g.category ?? "",
    status: g.status,
    statusText: statusLabel(g.status),
    program: g.program,
    milestoneCount: g.milestoneCount,
    paidCount: g.paidCount,
    milestonesText: `${g.paidCount}/${g.milestoneCount}`,
    _usd: Number(g.usdCents),
    _zec: Number(g.zecZat),
  }));

  return (
    <>
      <PageHeader
        title="Grants"
        subtitle="Each grant is an approved project that aggregates its milestones. A single grantee can hold several grants (for example, Zcash Brazil has 7). Click a grant to view its payments."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Grants"
          value={String(summary.grantCount)}
          sub="approved projects"
        />
        <Stat
          label="Committed"
          value={formatUsdCents(summary.committedCents, { compact: true })}
          sub="USD, excluding cancelled"
          tone="warn"
        />
        <Stat
          label="Paid"
          value={formatUsdCents(summary.paidCents, { compact: true })}
          sub="milestones already paid"
        />
        <Stat
          label="Open"
          value={formatUsdCents(summary.futureCents, { compact: true })}
          sub="committed, still to pay"
        />
      </section>

      <Card className="overflow-hidden p-0">
        <div className="p-4">
          <GrantsTable rows={rows} />
        </div>
      </Card>

      <p className="mt-4 text-xs text-stone-500">
        {grants.length} grants · one project per row · click to view its
        milestones
      </p>

      <Synced className="mt-4" />
    </>
  );
}
