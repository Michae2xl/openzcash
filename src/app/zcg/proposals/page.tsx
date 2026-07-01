import Link from "next/link";
import { Card, PageHeader, Stat } from "@/components/ui";
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
    source: "sheet",
  };
}

export default async function PropostasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterRaw } = await searchParams;
  const [isAdmin, funnel, all, links, applications] = await Promise.all([
    getIsAdmin(),
    cached("proposalsFunnel", LEDGER_TTL_MS, () => proposalsFunnel()),
    cached("listProposals:all", LEDGER_TTL_MS, () => listProposals({})),
    cached("links", LEDGER_TTL_MS, () => getLinks()),
    getGrantApplications(40),
  ]);
  const submitUrl = links.proposal_zcg ?? "#";

  // Live "ready for review" applications from GitHub → table rows, upstream of
  // the spreadsheet's under-review bucket.
  const ghRows: ProposalTableRow[] = applications
    .filter((a) => a.status === "review")
    .map((a) => ({
      id: `gh-${a.number}`,
      title: a.title,
      platformLink: a.url,
      applicant: a.applicant ? `@${a.applicant}` : "",
      submitted: (a.createdAt || "").slice(0, 10),
      status: "under_review",
      statusLabel: "Under review",
      source: "github" as const,
    }));

  const allRows = [...ghRows, ...all.slice(0, 400).map(toTableRow)];

  // Funnel counts with the live GitHub under-review folded in.
  let byStatus = funnel.byStatus.map((b) =>
    b.status === "under_review" ? { ...b, count: b.count + ghRows.length } : b,
  );
  if (ghRows.length > 0 && !byStatus.some((b) => b.status === "under_review")) {
    byStatus = [...byStatus, { status: "under_review", count: ghRows.length }];
  }
  const total = funnel.total + ghRows.length;
  const approved = byStatus.find((b) => b.status === "approved")?.count ?? 0;
  const maxStatus = byStatus.reduce((m, b) => Math.max(m, b.count), 0);
  const apprRate = total ? Math.round((approved / total) * 100) : 0;

  // Filter the table by the clicked funnel verdict.
  const active =
    filterRaw && STATUS_LABEL[filterRaw] ? (filterRaw as string) : null;
  const shownRows = active
    ? allRows.filter((r) => r.status === active)
    : allRows;

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
        <Stat label="Proposals" value={String(total)} sub="since 2021" />
        <Stat
          label="Approved"
          value={String(approved)}
          sub={`${apprRate}% approval rate`}
        />
        <Stat
          label="Ready for review"
          value={String(ghRows.length)}
          sub="live from GitHub"
          tone="warn"
        />
        <Stat
          label="Showing"
          value={String(shownRows.length)}
          sub={active ? (STATUS_LABEL[active] ?? active) : "all verdicts"}
        />
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-700">
            Funnel by verdict
          </h2>
          <span className="text-xs text-stone-400">click to filter ↓</span>
        </div>
        <Card className="space-y-1.5">
          {byStatus.map((b) => {
            const isActive = active === b.status;
            return (
              <Link
                key={b.status}
                href={
                  isActive
                    ? "/zcg/proposals"
                    : `/zcg/proposals?status=${b.status}`
                }
                scroll={false}
                className={cn(
                  "block rounded-lg px-2.5 py-1.5 transition",
                  isActive
                    ? "bg-amber-500/10 ring-1 ring-inset ring-amber-500/30"
                    : "hover:bg-stone-100",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      isActive
                        ? "font-semibold text-amber-800"
                        : "text-stone-700",
                    )}
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                    {isActive ? (
                      <span className="text-amber-600">✓</span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "tnum",
                      isActive
                        ? "font-semibold text-amber-800"
                        : "text-stone-600",
                    )}
                  >
                    {b.count}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn("h-full rounded-full", barColor(b.status))}
                    style={{
                      width: `${maxStatus ? Math.max((b.count / maxStatus) * 100, 1.5) : 0}%`,
                    }}
                  />
                </div>
              </Link>
            );
          })}
        </Card>
      </section>

      {active ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-500">Filtered to</span>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 font-medium text-amber-800">
            {STATUS_LABEL[active] ?? active} · {shownRows.length}
          </span>
          <Link
            href="/zcg/proposals"
            scroll={false}
            className="font-medium text-stone-500 hover:text-stone-700"
          >
            Clear ✕
          </Link>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <ProposalsTable rows={shownRows} isAdmin={isAdmin} />
      </Card>

      <p className="mt-3 text-xs text-stone-500">
        Rows tagged{" "}
        <span className="rounded bg-indigo-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-indigo-700">
          GitHub live
        </span>{" "}
        are open applications read straight from the{" "}
        <a
          href={ZCG_APPLICATIONS_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-amber-700 hover:underline"
        >
          ZCG issue tracker ↗
        </a>{" "}
        — the rest are mirrored from the spreadsheet.
      </p>
    </>
  );
}
