"use client";

import { Badge } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { disbStatusLabel, formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";
import { cn } from "@/lib/utils";

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
};

function statusTone(status: string | null) {
  if (status === "completed") return "emerald" as const;
  if (status === "cancelled" || status === "keyholder_veto")
    return "rose" as const;
  if (status === "funds_returned") return "amber" as const;
  return "zinc" as const;
}

interface DisbursementsTableProps {
  rows: DisbTableRow[];
}

export function DisbursementsTable({ rows }: DisbursementsTableProps) {
  const columns: Column<DisbTableRow>[] = [
    {
      key: "recipient",
      header: "Recipient",
      sortable: true,
      filterable: true,
      filterValue: (r) => `${r.recipient} ${r.type}`,
      render: (r) => (
        <div>
          <span className="font-medium text-stone-900">{r.recipient}</span>
          <span className="ml-2 text-[10px] uppercase tracking-wide text-stone-400">
            {r.type}
          </span>
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
        <span className="block max-w-[22rem] truncate text-stone-500">
          {r.detail || "·"}
          {r.milestoneSeq ? (
            <span className="text-stone-400"> · m{r.milestoneSeq}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      filterable: true,
      render: (r) =>
        r.category ? (
          <span className="text-xs text-stone-500">{r.category}</span>
        ) : (
          <span className="text-stone-400">·</span>
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
        <span className="whitespace-nowrap text-xs text-stone-500">
          {r.date || "·"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterValue: (r) => disbStatusLabel(r.status),
      sortValue: (r) => disbStatusLabel(r.status),
      render: (r) => (
        <Badge tone={statusTone(r.status)}>{disbStatusLabel(r.status)}</Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      initialSort={{ key: "date", dir: "desc" }}
    />
  );
}
