"use client";

import { Badge } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { ProposalAdminControls } from "./proposal-admin";

/** Serializable shape for the DataTable (no bigint). */
export type ProposalTableRow = {
  id: string;
  title: string;
  platformLink: string | null;
  applicant: string;
  submitted: string;
  status: string;
  statusLabel: string;
};

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
    render: (r) =>
      r.platformLink ? (
        <a
          href={r.platformLink}
          target="_blank"
          rel="noreferrer"
          className="block max-w-[26rem] truncate font-medium text-stone-900 hover:text-amber-700"
        >
          {r.title}
        </a>
      ) : (
        <span className="block max-w-[26rem] truncate font-medium text-stone-900">
          {r.title}
        </span>
      ),
  },
  {
    key: "applicant",
    header: "Applicant",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.applicant.toLowerCase(),
    filterValue: (r) => r.applicant,
    render: (r) => (
      <span className="block max-w-[12rem] truncate text-stone-500">
        {r.applicant || "·"}
      </span>
    ),
  },
  {
    key: "submitted",
    header: "Submitted",
    align: "right",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.submitted,
    filterValue: (r) => r.submitted,
    render: (r) => (
      <span className="whitespace-nowrap text-xs text-stone-500 tnum">
        {r.submitted || "·"}
      </span>
    ),
  },
  {
    key: "statusLabel",
    header: "Verdict",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.statusLabel.toLowerCase(),
    filterValue: (r) => r.statusLabel,
    render: (r) => <Badge tone={tone(r.status)}>{r.statusLabel}</Badge>,
  },
];

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
  const cols = isAdmin ? [...columns, manageColumn] : columns;
  return (
    <DataTable
      columns={cols}
      rows={rows}
      initialSort={{ key: "submitted", dir: "desc" }}
      maxHeight="max-h-[60vh]"
    />
  );
}
