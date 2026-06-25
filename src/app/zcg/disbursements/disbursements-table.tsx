"use client";

import { Badge } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { disbStatusLabel, formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";
import { cn } from "@/lib/utils";
import { DisbursementAdminControls, type DisbEdit } from "./disbursement-admin";

/** Serializable row for the client DataTable (no bigint). */
export type DisbTableRow = {
  id: string;
  recipient: string;
  type: string;
  detail: string;
  milestoneSeq: number | null;
  category: string;
  status: string | null;
  date: string;
  _usdCents: number | null;
  _usd: number;
  _zecZat: number | null;
  _zec: number;
  isClawback: boolean;
  settlementAsset: string;
  origin: string;
  edited: boolean;
  edit: DisbEdit;
};

function statusTone(status: string | null) {
  if (status === "completed") return "emerald" as const;
  if (status === "cancelled" || status === "keyholder_veto")
    return "rose" as const;
  if (status === "funds_returned") return "amber" as const;
  return "zinc" as const;
}

/** Public provenance marker: where this row's data came from. */
function SourceTag({ origin, edited }: { origin: string; edited: boolean }) {
  if (origin === "admin")
    return (
      <span className="rounded bg-amber-500/12 px-1 py-px text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/20">
        admin entry
      </span>
    );
  if (edited)
    return (
      <span className="rounded bg-amber-500/12 px-1 py-px text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/20">
        admin-edited
      </span>
    );
  return <span className="text-[10px] text-stone-500">from spreadsheet</span>;
}

interface DisbursementsTableProps {
  rows: DisbTableRow[];
  isAdmin?: boolean;
}

export function DisbursementsTable({
  rows,
  isAdmin = false,
}: DisbursementsTableProps) {
  const columns: Column<DisbTableRow>[] = [
    {
      key: "recipient",
      header: "Recipient",
      sortable: true,
      filterable: true,
      filterValue: (r) => `${r.recipient} ${r.type}`,
      render: (r) => (
        <div>
          <div>
            <span className="font-medium text-stone-900">{r.recipient}</span>
            <span className="ml-2 text-[10px] uppercase tracking-wide text-stone-500">
              {r.type}
            </span>
          </div>
          <div className="mt-0.5">
            <SourceTag origin={r.origin} edited={r.edited} />
          </div>
        </div>
      ),
    },
    {
      key: "detail",
      header: "Detail",
      sortable: true,
      filterable: true,
      filterValue: (r) =>
        `${r.detail}${r.milestoneSeq ? ` m${r.milestoneSeq}` : ""}`,
      render: (r) => (
        <span className="block max-w-[22rem] truncate text-stone-600">
          {r.detail || "·"}
          {r.milestoneSeq ? (
            <span className="text-stone-500"> · m{r.milestoneSeq}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      filterType: "select",
      render: (r) =>
        r.category ? (
          <span className="text-xs text-stone-600">{r.category}</span>
        ) : (
          <span className="text-stone-500">·</span>
        ),
    },
    {
      key: "usd",
      header: "USD",
      align: "right",
      sortable: true,
      sortValue: (r) => r._usd,
      render: (r) => (
        <span className="font-medium text-amber-700/90">
          {formatUsdCents(r._usdCents)}
        </span>
      ),
    },
    {
      key: "zec",
      header: "ZEC",
      align: "right",
      sortable: true,
      sortValue: (r) => r._zec,
      render: (r) => (
        <span className={cn(r.isClawback ? "text-rose-600" : "text-stone-700")}>
          {r._zecZat != null
            ? formatZec(BigInt(r._zecZat), {
                symbol: false,
                sign: r.isClawback,
              })
            : r.settlementAsset !== "ZEC"
              ? r.settlementAsset
              : "·"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      align: "right",
      sortable: true,
      filterable: true,
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="whitespace-nowrap text-xs text-stone-600">
          {r.date || "·"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterValue: (r) => disbStatusLabel(r.status),
      sortValue: (r) => disbStatusLabel(r.status),
      render: (r) => (
        <Badge tone={statusTone(r.status)}>{disbStatusLabel(r.status)}</Badge>
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      key: "manage",
      header: "Manage",
      align: "right",
      render: (r) => (
        <DisbursementAdminControls
          id={r.id}
          origin={r.origin}
          edited={r.edited}
          initial={r.edit}
        />
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      initialSort={{ key: "date", dir: "desc" }}
    />
  );
}
