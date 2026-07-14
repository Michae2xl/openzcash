"use client";

import { Badge } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { ProposalAdminControls } from "./proposal-admin";

/** Public-data diligence signals for an under-review row (see lib/zcg/diligence). */
export type RowDiligence = {
  /** GitHub login the signals were computed for — used to link each badge to its source. */
  applicant: string;
  accountAgeYears: number | null;
  publicRepos: number | null;
  forumAgeYears: number | null;
  forumPosts: number | null;
  priorApps: number | null;
  priorApproved: number | null;
  priorDeclined: number | null;
  dupCount: number | null;
  dupUrl: string | null;
};

/** Serializable shape for the DataTable (no bigint). */
export type ProposalTableRow = {
  id: string;
  title: string;
  platformLink: string | null;
  applicant: string;
  submitted: string;
  status: string;
  statusLabel: string;
  /** "github" = live GitHub issue (ready for review); "sheet" = mirrored row. */
  source?: "sheet" | "github";
  /** Requested grant amount in whole USD (from the GitHub application), or null. */
  amountUsd?: number | null;
  /** Diligence signals — only computed for the live under-review set. */
  diligence?: RowDiligence | null;
};

const chip =
  "inline-flex items-center whitespace-nowrap rounded px-1.5 py-px text-[10px] font-medium ring-1 ring-inset";

/**
 * Compact public-data signals: forum tenure, GitHub tenure, prior ZCG track
 * record, and a similar-title-elsewhere warning. Every badge links to its
 * source so reviewers can verify the receipt themselves. Signals inform,
 * reviewers decide — absence of a signal is not a red flag.
 */
function DiligenceCell({ d }: { d: RowDiligence }) {
  const years = (n: number) => (n < 1 ? "<1y" : `${n}y`);
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  const login = encodeURIComponent(d.applicant);
  const priorUrl = `https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues?q=${encodeURIComponent(`is:issue author:${d.applicant}`)}`;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {d.forumAgeYears != null ? (
        <a
          href={`https://forum.zcashcommunity.com/u/${login}/summary`}
          target="_blank"
          rel="noreferrer"
          className={`${chip} bg-amber-500/10 text-amber-800 ring-amber-500/20 hover:bg-amber-500/20`}
          title={`Zcash forum account with the same handle: ${d.forumAgeYears < 1 ? "under a year" : `${d.forumAgeYears} year(s)`} old${d.forumPosts != null ? `, ${d.forumPosts} posts` : ""} (best-effort handle match) — opens the forum profile`}
        >
          forum {years(d.forumAgeYears)}
          {d.forumPosts != null ? ` · ${plural(d.forumPosts, "post")}` : ""}
        </a>
      ) : null}
      {d.accountAgeYears != null ? (
        <a
          href={`https://github.com/${login}`}
          target="_blank"
          rel="noreferrer"
          className={`${chip} bg-stone-500/10 text-stone-700 ring-stone-500/20 hover:bg-stone-500/20`}
          title={`GitHub account: ${d.accountAgeYears < 1 ? "under a year" : `${d.accountAgeYears} year(s)`} old, ${d.publicRepos ?? 0} public repos — opens the GitHub profile`}
        >
          GH {years(d.accountAgeYears)} · {plural(d.publicRepos ?? 0, "repo")}
        </a>
      ) : null}
      {d.priorApps != null ? (
        <a
          href={priorUrl}
          target="_blank"
          rel="noreferrer"
          className={`${chip} bg-sky-500/10 text-sky-800 ring-sky-500/20 hover:bg-sky-500/20`}
          title={
            d.priorApps === 0
              ? "No earlier grant applications from this GitHub account in the ZCG repo — opens the author's issue history"
              : `${d.priorApps} earlier ZCG application(s) from this account: ${d.priorApproved ?? 0} approved, ${d.priorDeclined ?? 0} declined — opens the author's issue history`
          }
        >
          {d.priorApps === 0
            ? "first application"
            : `${d.priorApps} prior · ${d.priorApproved ?? 0} approved`}
        </a>
      ) : null}
      {d.dupCount != null && d.dupCount > 0 && d.dupUrl ? (
        <a
          href={d.dupUrl}
          target="_blank"
          rel="noreferrer"
          className={`${chip} bg-rose-500/10 text-rose-800 ring-rose-500/20 hover:bg-rose-500/20`}
          title="Issues elsewhere on GitHub share this proposal's title — opens the GitHub search so you can check for the same pitch filed with other ecosystems"
        >
          ⚠ similar title elsewhere
        </a>
      ) : null}
    </div>
  );
}

function tone(status: string) {
  if (status === "approved") return "emerald" as const;
  if (status === "rejected" || status === "vetoed") return "rose" as const;
  if (status === "pending" || status === "under_review")
    return "amber" as const;
  return "zinc" as const;
}

const columns: Column<ProposalTableRow>[] = [
  {
    key: "title",
    header: "Proposal",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.title.toLowerCase(),
    filterValue: (r) => r.title,
    render: (r) => (
      <div className="flex items-center gap-2">
        {r.platformLink ? (
          <a
            href={r.platformLink}
            target="_blank"
            rel="noreferrer"
            className="block max-w-[24rem] truncate font-medium text-stone-900 hover:text-amber-700"
          >
            {r.title}
          </a>
        ) : (
          <span className="block max-w-[24rem] truncate font-medium text-stone-900">
            {r.title}
          </span>
        )}
        {r.source === "github" ? (
          <span className="shrink-0 rounded bg-indigo-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-500/20">
            GitHub live
          </span>
        ) : null}
      </div>
    ),
  },
  {
    key: "applicant",
    header: "Applicant",
    mobileHidden: true,
    sortable: true,
    filterable: true,
    sortValue: (r) => r.applicant.toLowerCase(),
    filterValue: (r) => r.applicant,
    render: (r) => (
      <span className="block max-w-[12rem] truncate text-stone-600">
        {r.applicant || "·"}
      </span>
    ),
  },
  {
    key: "submitted",
    header: "Submitted",
    mobileHidden: true,
    align: "right",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.submitted,
    filterValue: (r) => r.submitted,
    render: (r) => (
      <span className="whitespace-nowrap text-xs text-stone-600 tnum">
        {r.submitted || "·"}
      </span>
    ),
  },
  {
    key: "amountUsd",
    header: "Requested",
    align: "right",
    sortable: true,
    sortValue: (r) => r.amountUsd ?? -1,
    render: (r) =>
      r.amountUsd != null ? (
        <span
          className="whitespace-nowrap text-xs font-semibold text-stone-800 tnum"
          title={`Requested grant amount: $${r.amountUsd.toLocaleString("en-US")} USD`}
        >
          ${r.amountUsd.toLocaleString("en-US")}
        </span>
      ) : (
        <span className="text-stone-300">·</span>
      ),
  },
  {
    key: "statusLabel",
    header: "Verdict",
    sortable: true,
    filterable: true,
    filterType: "select",
    sortValue: (r) => r.statusLabel.toLowerCase(),
    filterValue: (r) => r.statusLabel,
    render: (r) => <Badge tone={tone(r.status)}>{r.statusLabel}</Badge>,
  },
];

const diligenceColumn: Column<ProposalTableRow> = {
  key: "diligence",
  header: "Diligence",
  align: "right",
  mobileHidden: true,
  render: (r) =>
    r.diligence ? (
      <DiligenceCell d={r.diligence} />
    ) : (
      <span className="text-stone-300">·</span>
    ),
};

const manageColumn: Column<ProposalTableRow> = {
  key: "manage",
  header: "Manage",
  align: "right",
  render: (r) => <ProposalAdminControls id={r.id} status={r.status} />,
};

interface ProposalsTableProps {
  rows: ProposalTableRow[];
  isAdmin?: boolean;
}

export function ProposalsTable({ rows, isAdmin = false }: ProposalsTableProps) {
  // Diligence signals exist only for the live under-review set; skip the
  // column entirely when the current view has none (e.g. historical filters).
  const hasDiligence = rows.some((r) => r.diligence);
  const cols = [
    ...columns,
    ...(hasDiligence ? [diligenceColumn] : []),
    ...(isAdmin ? [manageColumn] : []),
  ];
  return (
    <DataTable
      columns={cols}
      rows={rows}
      initialSort={{ key: "submitted", dir: "desc" }}
      maxHeight="max-h-[60vh]"
    />
  );
}
