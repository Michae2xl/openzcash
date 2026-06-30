import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import {
  listProposals,
  proposalsFunnel,
  type ProposalRow,
} from "@/lib/zcg/proposals-repo";
import { cn } from "@/lib/utils";
import { getIsAdmin } from "@/lib/auth/admin";
import { getLinks } from "@/lib/zcg/governance-repo";
import { ProposalsTable, type ProposalTableRow } from "./proposals-table";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import {
  getGrantApplications,
  ZCG_APPLICATIONS_REPO_URL,
  type AppStatus,
} from "@/lib/zcg/github-applications";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZCG Proposals · OpenZcash" };

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

const APP_STATUS: Record<
  AppStatus,
  { label: string; tone: "amber" | "emerald" | "zinc" }
> = {
  review: { label: "Ready for review", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  paid: { label: "Paid", tone: "emerald" },
  other: { label: "Open", tone: "zinc" },
};

function appDate(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t)
    ? ""
    : new Date(t).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export default async function PropostasPage() {
  const [isAdmin, funnel, all, links, applications] = await Promise.all([
    getIsAdmin(),
    cached("proposalsFunnel", LEDGER_TTL_MS, () => proposalsFunnel()),
    cached("listProposals:all", LEDGER_TTL_MS, () => listProposals({})),
    cached("links", LEDGER_TTL_MS, () => getLinks()),
    getGrantApplications(40),
  ]);
  const submitUrl = links.proposal_zcg ?? "#";
  // GitHub applications, "ready for review" first then newest.
  const apps = [...applications].sort((a, b) => {
    const ra = a.status === "review" ? 0 : 1;
    const rb = b.status === "review" ? 0 : 1;
    return ra - rb || b.createdAt.localeCompare(a.createdAt);
  });
  const reviewCount = applications.filter((a) => a.status === "review").length;
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
        title="Proposals · Pipeline"
        subtitle="ZCG governance funnel: every submitted proposal, with its verdict. Upstream of grants, only the approved ones become funded projects."
        actions={
          <a
            href={submitUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400"
          >
            Submit a proposal ↗
          </a>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Proposals" value={String(funnel.total)} sub="since 2021" />
        <Stat
          label="Approved"
          value={String(approved)}
          sub={`${apprRate}% approval rate`}
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

      {apps.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-stone-700">
              Live applications · GitHub
            </h2>
            <a
              href={ZCG_APPLICATIONS_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs font-medium text-amber-700 hover:underline"
            >
              {reviewCount} ready for review ↗
            </a>
          </div>
          <Card className="p-0">
            <p className="border-b border-stone-200 px-5 py-3 text-[11px] text-stone-500">
              Submitted as GitHub issues — the rawest stage, before the
              spreadsheet. &ldquo;Ready for review&rdquo; means the committee
              can judge it now.
            </p>
            <div className="scroll-thin max-h-[26rem] divide-y divide-stone-100 overflow-y-auto">
              {apps.map((a) => {
                const st = APP_STATUS[a.status];
                return (
                  <a
                    key={a.number}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start justify-between gap-3 px-5 py-3 transition hover:bg-amber-500/[0.05]"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2">
                        <span className="shrink-0 font-mono text-[10px] text-stone-400">
                          #{a.number}
                        </span>
                        <span className="truncate text-sm font-medium text-stone-900">
                          {a.title}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        @{a.applicant} · {appDate(a.createdAt)}
                        {a.comments > 0 ? ` · ${a.comments} comments` : ""}
                      </p>
                    </div>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </a>
                );
              })}
            </div>
          </Card>
        </section>
      ) : null}

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
                <span className="text-stone-600 tnum">{b.count}</span>
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
        <ProposalsTable rows={rows} isAdmin={isAdmin} />
      </Card>
    </>
  );
}
