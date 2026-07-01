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
import { titlesMatch } from "@/lib/zcg/match-titles";
import { Synced } from "@/components/synced";

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

  // Live "ready for review" grant applications, read first-hand from GitHub.
  const ghApps = applications.filter((a) => a.status === "review");

  // Each GitHub application is usually already mirrored in the spreadsheet's
  // under-review bucket. Enrich the matching sheet row with a "GitHub live"
  // badge + direct issue link instead of listing it twice; only applications
  // with no sheet counterpart become their own new rows.
  const usedGh = new Set<number>();
  const enrichedSheet = all
    .slice(0, 400)
    .map(toTableRow)
    .map((r) => {
      const idx = ghApps.findIndex(
        (g, i) => !usedGh.has(i) && titlesMatch(r.title, g.title),
      );
      if (idx < 0) return r;
      usedGh.add(idx);
      return {
        ...r,
        source: "github" as const,
        platformLink: ghApps[idx].url ?? r.platformLink,
        amountUsd: ghApps[idx].amountUsd,
      };
    });

  const netNewGhRows: ProposalTableRow[] = ghApps
    .filter((_, i) => !usedGh.has(i))
    .map((a) => ({
      id: `gh-${a.number}`,
      title: a.title,
      platformLink: a.url,
      applicant: a.applicant ? `@${a.applicant}` : "",
      submitted: (a.createdAt || "").slice(0, 10),
      status: "under_review",
      statusLabel: "Under review",
      source: "github" as const,
      amountUsd: a.amountUsd,
    }));

  const allRows = [...netNewGhRows, ...enrichedSheet];

  // Funnel: only applications with no sheet counterpart are net-new to the counts.
  const netNewCount = netNewGhRows.length;
  let byStatus = funnel.byStatus.map((b) =>
    b.status === "under_review" ? { ...b, count: b.count + netNewCount } : b,
  );
  if (netNewCount > 0 && !byStatus.some((b) => b.status === "under_review")) {
    byStatus = [...byStatus, { status: "under_review", count: netNewCount }];
  }
  const total = funnel.total + netNewCount;
  const approved = byStatus.find((b) => b.status === "approved")?.count ?? 0;
  const maxStatus = byStatus.reduce((m, b) => Math.max(m, b.count), 0);
  const apprRate = total ? Math.round((approved / total) * 100) : 0;

  // #8 How fast does ZCG decide? Average committee turnaround, from the dates
  // already recorded on each proposal.
  const decided = all.filter((p) => p.decisionTurnaroundDays != null);
  const avgDecisionDays = decided.length
    ? Math.round(
        decided.reduce((s, p) => s + (p.decisionTurnaroundDays ?? 0), 0) /
          decided.length,
      )
    : null;

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

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Proposals" value={String(total)} sub="since 2021" />
        <Stat
          label="Approved"
          value={String(approved)}
          sub={`${apprRate}% approval rate`}
        />
        <Stat
          label="Avg decision"
          value={avgDecisionDays != null ? `${avgDecisionDays}d` : "n/a"}
          sub="committee turnaround"
        />
        <Stat
          label="Ready for review"
          value={String(ghApps.length)}
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
        </a>
        . The rest are mirrored from the spreadsheet.
      </p>

      <Synced className="mt-4" />

      {/* ZCG Copilot teaser (admin-only while the skill's public repo is
          unpublished; flip to public by dropping the isAdmin gate). */}
      {isAdmin ? (
        <section className="mt-8">
          <Link href="/zcg/copilot" className="group block">
            <div className="relative overflow-hidden border border-stone-900 bg-[#0b0d10] p-5 antialiased shadow-lg shadow-stone-400/30 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-400">
                    ZCG Copilot · agent skill · hidden preview
                  </span>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
                    Every answer has a receipt.
                  </h2>
                  <p className="mt-1.5 max-w-xl font-mono text-xs leading-relaxed text-stone-500">
                    ❯ Find any grants for merchants to accept Zcash. Funded,
                    under review, declined. Exact totals, cited.
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-2 border border-white/15 bg-black/60 px-4 py-2 font-mono text-sm text-emerald-400 transition group-hover:border-emerald-400/40 sm:inline-flex">
                  Preview{" "}
                  <span className="transition group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </div>
            </div>
          </Link>
        </section>
      ) : null}
    </>
  );
}
