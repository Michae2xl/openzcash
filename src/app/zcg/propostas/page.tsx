import { Card, PageHeader, Stat } from "@/components/ui";
import {
  listProposals,
  proposalsFunnel,
  type ProposalRow,
} from "@/lib/zcg/proposals-repo";
import { cn } from "@/lib/utils";
import { ProposalsTable, type ProposalTableRow } from "./proposals-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZCG Proposals · ZEC Back-office" };

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  filtered: "Filtered",
  under_review: "Under review",
  pending: "Pending",
  vetoed: "Vetoed",
};

function barColor(status: string) {
  if (status === "approved") return "bg-emerald-500/70";
  if (status === "rejected" || status === "vetoed") return "bg-rose-500/70";
  if (status === "pending" || status === "under_review")
    return "bg-amber-500/70";
  return "bg-stone-400/70";
}

function toTableRow(p: ProposalRow): ProposalTableRow {
  return {
    id: p.id,
    title: p.title,
    platformLink: p.platformLink ?? null,
    applicant: p.applicantsRaw ?? "",
    submitted: p.submittedDate ?? "",
    status: p.status,
    statusLabel: STATUS_LABEL[p.status] ?? p.status,
  };
}

export default async function PropostasPage() {
  const [funnel, all] = await Promise.all([
    proposalsFunnel(),
    listProposals({}),
  ]);
  const proposals = all.slice(0, 400);
  const rows = proposals.map(toTableRow);

  const approved =
    funnel.byStatus.find((b) => b.status === "approved")?.count ?? 0;
  const maxStatus = funnel.byStatus.reduce((m, b) => Math.max(m, b.count), 0);
  const apprRate = funnel.total
    ? Math.round((approved / funnel.total) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Proposals · pipeline"
        subtitle="ZCG governance funnel: every submitted proposal, with its verdict. Upstream of grants, only the approved ones become funded projects."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Proposals" value={String(funnel.total)} sub="since 2021" />
        <Stat
          label="Approved"
          value={String(approved)}
          sub={`${apprRate}% approval rate`}
          tone="in"
        />
        <Stat
          label="Programs"
          value={String(funnel.byProgram.length)}
          sub="ZCG + coinholder"
        />
        <Stat
          label="Showing"
          value={String(proposals.length)}
          sub="most recent"
          tone="warn"
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Funnel by verdict
        </h2>
        <Card className="space-y-3">
          {funnel.byStatus.map((b) => (
            <div key={b.status}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-700">
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
                <span className="text-stone-500 tnum">{b.count}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={cn("h-full rounded-full", barColor(b.status))}
                  style={{
                    width: `${maxStatus ? Math.max((b.count / maxStatus) * 100, 1.5) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </Card>
      </section>

      <Card className="overflow-hidden">
        <ProposalsTable rows={rows} />
      </Card>
    </>
  );
}
