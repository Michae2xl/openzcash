"use client";

import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui";
import { formatUsdCents } from "@/lib/zcg/format";
import {
  ROUND_BAND_LABEL,
  ROUND_PROPOSALS,
  type RoundBand,
} from "@/lib/zcg/coinholder-round";

/** Serializable row for the DataTable (static dataset, no bigint involved). */
type RoundRow = {
  rank: number;
  project: string;
  org: string;
  summary: string;
  threadUrl: string;
  githubUrl: string;
  band: RoundBand;
  bandLabel: string;
  _usd: number;
};

const rows: RoundRow[] = ROUND_PROPOSALS.map((p) => ({
  rank: p.rank,
  project: p.project,
  org: p.org,
  summary: p.summary,
  threadUrl: p.threadUrl,
  githubUrl: p.githubUrl,
  band: p.band,
  bandLabel: ROUND_BAND_LABEL[p.band],
  _usd: p.requestedUsdCents,
}));

function bandTone(band: RoundBand) {
  if (band === "over_150k") return "rose" as const;
  if (band === "mid_25k_150k") return "amber" as const;
  return "zinc" as const;
}

const columns: Column<RoundRow>[] = [
  {
    key: "rank",
    header: "#",
    sortable: true,
    sortValue: (r) => r.rank,
    render: (r): ReactNode => (
      <span className="text-xs text-stone-600 tnum">{r.rank}</span>
    ),
  },
  {
    key: "project",
    header: "Project",
    sortable: true,
    filterable: true,
    filterValue: (r) => `${r.project} ${r.summary}`,
    render: (r): ReactNode => (
      <span className="block max-w-[24rem]">
        <a
          href={r.threadUrl}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-medium text-stone-900 hover:text-amber-700"
        >
          {r.project}
        </a>
        <span className="block truncate text-xs text-stone-600">
          {r.summary}
        </span>
      </span>
    ),
  },
  {
    key: "org",
    header: "Organization",
    sortable: true,
    filterable: true,
    mobileHidden: true,
    render: (r): ReactNode => (
      <span className="block max-w-[12rem] truncate text-stone-600">
        {r.org}
      </span>
    ),
  },
  {
    key: "band",
    header: "Size",
    sortable: true,
    filterable: true,
    filterType: "select",
    mobileHidden: true,
    sortValue: (r) => r._usd,
    filterValue: (r) => r.bandLabel,
    render: (r): ReactNode => (
      <Badge tone={bandTone(r.band)}>{r.bandLabel}</Badge>
    ),
  },
  {
    key: "_usd",
    header: "USD requested",
    align: "right",
    sortable: true,
    sortValue: (r) => r._usd,
    render: (r): ReactNode => (
      <span className="font-medium text-amber-700/90">
        {formatUsdCents(r._usd)}
      </span>
    ),
  },
  {
    key: "githubUrl",
    header: "Evidence",
    mobileHidden: true,
    render: (r): ReactNode => (
      <a
        href={r.githubUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-amber-700"
      >
        GitHub ↗
      </a>
    ),
  },
];

export function RoundProposalsTable() {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      initialSort={{ key: "rank", dir: "asc" }}
    />
  );
}
