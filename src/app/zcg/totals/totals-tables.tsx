"use client";

import { Card } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { formatUsdCents } from "@/lib/zcg/format";

// Headers mirror the ZCG spreadsheet so the team recognizes each column.

export type CategoryRow = {
  key: string;
  category: string;
  _usd: number;
  _pct: number;
};

export type RecipientRow = {
  key: string;
  rank: number;
  recipient: string;
  _usd: number;
  _future: number;
  _pct: number;
};

interface TotalsTablesProps {
  categoryRows: CategoryRow[];
  recipientRows: RecipientRow[];
}

/** Share-of-total cell: a thin gold bar + the percentage. */
function PctCell({ pct }: { pct: number }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className="hidden h-1 w-14 overflow-hidden rounded-full bg-stone-100 sm:block"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-amber-500/70"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </span>
      <span className="tnum text-xs text-stone-600">{pct.toFixed(1)}%</span>
    </div>
  );
}

const pctColumn = {
  key: "pct",
  header: "% of total",
  align: "right" as const,
  sortable: true,
  sortValue: (r: { _pct: number }) => r._pct,
  render: (r: { _pct: number }) => <PctCell pct={r._pct} />,
};

const categoryColumns: Column<CategoryRow>[] = [
  {
    key: "category",
    header: "Classification",
    sortable: true,
    filterable: true,
    filterType: "select",
    render: (r) => (
      <span className="block max-w-[16rem] truncate font-medium text-stone-900">
        {r.category}
      </span>
    ),
  },
  {
    key: "usd",
    header: "USD paid out to date",
    align: "right",
    sortable: true,
    sortValue: (r) => r._usd,
    render: (r) => (
      <span className="font-medium text-amber-700/90">
        {formatUsdCents(r._usd, { compact: true })}
      </span>
    ),
  },
  pctColumn,
];

const recipientColumns: Column<RecipientRow>[] = [
  {
    key: "rank",
    header: "#",
    align: "right",
    sortable: true,
    sortValue: (r) => r.rank,
    render: (r) => <span className="text-xs text-stone-500">{r.rank}</span>,
  },
  {
    key: "recipient",
    header: "Recipient or Classification",
    sortable: true,
    filterable: true,
    render: (r) => (
      <span className="block max-w-[16rem] truncate font-medium text-stone-900">
        {r.recipient}
      </span>
    ),
  },
  {
    key: "usd",
    header: "USD value paid out to date",
    align: "right",
    sortable: true,
    sortValue: (r) => r._usd,
    render: (r) => (
      <span className="font-medium text-amber-700/90">
        {formatUsdCents(r._usd, { compact: true })}
      </span>
    ),
  },
  {
    key: "future",
    header: "Future milestones",
    align: "right",
    sortable: true,
    sortValue: (r) => r._future,
    render: (r) =>
      r._future > 0 ? (
        <span className="text-stone-600 tnum">
          {formatUsdCents(r._future, { compact: true })}
        </span>
      ) : (
        <span className="text-stone-500">·</span>
      ),
  },
  pctColumn,
];

export function TotalsTables({
  categoryRows,
  recipientRows,
}: TotalsTablesProps) {
  return (
    <div className="space-y-6">
      <section className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          By recipient
        </h2>
        <Card className="overflow-hidden p-0">
          <DataTable
            columns={recipientColumns}
            rows={recipientRows}
            initialSort={{ key: "usd", dir: "desc" }}
            className="p-4"
            maxHeight="max-h-[60vh]"
          />
        </Card>
      </section>

      <section className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          By classification
        </h2>
        <Card className="overflow-hidden p-0">
          <DataTable
            columns={categoryColumns}
            rows={categoryRows}
            initialSort={{ key: "usd", dir: "desc" }}
            className="p-4"
            maxHeight="max-h-[60vh]"
          />
        </Card>
      </section>
    </div>
  );
}
