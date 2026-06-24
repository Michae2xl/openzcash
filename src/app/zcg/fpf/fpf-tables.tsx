"use client";

import type { ReactNode } from "react";
import { DataTable, type Column } from "@/components/data-table";
import { Badge } from "@/components/ui";
import { formatUsdCents } from "@/lib/zcg/format";

/** Serializable grant row for the DataTable (no bigint crosses the boundary). */
export type GrantTableRow = {
  grantKey: string;
  grantee: string;
  category: string;
  status: string | null;
  statusLabel: string;
  _usd: number;
};

/** Serializable proposal row for the DataTable. */
export type ProposalTableRow = {
  id: string;
  title: string;
  applicant: string;
  status: string;
  verdictLabel: string;
  platformLink: string | null;
  _usd: number;
};

interface FpfTablesProps {
  grantRows: GrantTableRow[];
  proposalRows: ProposalTableRow[];
}

function grantStatusTone(status: string | null) {
  if (status === "completed") return "emerald" as const;
  if (status === "cancelled" || status === "keyholder_veto")
    return "rose" as const;
  if (status === "open") return "amber" as const;
  return "zinc" as const;
}

function verdictTone(status: string) {
  if (status === "approved") return "emerald" as const;
  if (status === "rejected" || status === "vetoed") return "rose" as const;
  if (status === "pending" || status === "under_review")
    return "amber" as const;
  return "zinc" as const;
}

const grantColumns: Column<GrantTableRow>[] = [
  {
    key: "grantKey",
    header: "Project",
    sortable: true,
    filterable: true,
    render: (r): ReactNode => (
      <span className="block max-w-[22rem] truncate font-medium text-stone-900">
        {r.grantKey}
      </span>
    ),
  },
  {
    key: "grantee",
    header: "Recipient",
    sortable: true,
    filterable: true,
    render: (r): ReactNode => (
      <span className="block max-w-[14rem] truncate text-stone-500">
        {r.grantee}
      </span>
    ),
  },
  {
    key: "category",
    header: "Category",
    sortable: true,
    filterable: true,
    filterType: "select",
    render: (r): ReactNode => (
      <span className="text-xs text-stone-500">{r.category}</span>
    ),
  },
  {
    key: "_usd",
    header: "USD",
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
    key: "status",
    header: "Status",
    sortable: true,
    filterable: true,
    filterType: "select",
    sortValue: (r) => r.statusLabel,
    filterValue: (r) => r.statusLabel,
    render: (r): ReactNode => (
      <Badge tone={grantStatusTone(r.status)}>{r.statusLabel}</Badge>
    ),
  },
];

const proposalColumns: Column<ProposalTableRow>[] = [
  {
    key: "title",
    header: "Proposal",
    sortable: true,
    filterable: true,
    render: (r): ReactNode =>
      r.platformLink ? (
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
      ),
  },
  {
    key: "applicant",
    header: "Applicant",
    sortable: true,
    filterable: true,
    render: (r): ReactNode => (
      <span className="block max-w-[14rem] truncate text-stone-500">
        {r.applicant}
      </span>
    ),
  },
  {
    key: "_usd",
    header: "USD requested",
    align: "right",
    sortable: true,
    sortValue: (r) => r._usd,
    render: (r): ReactNode => (
      <span className="text-stone-700">
        {r._usd > 0 ? formatUsdCents(r._usd) : "·"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Verdict",
    sortable: true,
    filterable: true,
    filterType: "select",
    sortValue: (r) => r.verdictLabel,
    filterValue: (r) => r.verdictLabel,
    render: (r): ReactNode => (
      <Badge tone={verdictTone(r.status)}>{r.verdictLabel}</Badge>
    ),
  },
];

export function FpfGrantsTable({ grantRows }: { grantRows: GrantTableRow[] }) {
  return (
    <DataTable
      columns={grantColumns}
      rows={grantRows}
      initialSort={{ key: "_usd", dir: "desc" }}
    />
  );
}

export function FpfProposalsTable({
  proposalRows,
}: {
  proposalRows: ProposalTableRow[];
}) {
  return (
    <DataTable
      columns={proposalColumns}
      rows={proposalRows}
      initialSort={{ key: "_usd", dir: "desc" }}
    />
  );
}

export function FpfTables({ grantRows, proposalRows }: FpfTablesProps) {
  return (
    <>
      <FpfGrantsTable grantRows={grantRows} />
      <FpfProposalsTable proposalRows={proposalRows} />
    </>
  );
}
