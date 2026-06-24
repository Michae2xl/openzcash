"use client";

import { Card } from "@/components/ui";
import { DataTable, type Column } from "@/components/data-table";
import { formatUsdCents } from "@/lib/zcg/format";

export type CategoryRow = {
  key: string;
  category: string;
  _usd: number;
};

export type RecipientRow = {
  key: string;
  rank: number;
  recipient: string;
  _usd: number;
};

interface TotalsTablesProps {
  categoryRows: CategoryRow[];
  recipientRows: RecipientRow[];
}

const categoryColumns: Column<CategoryRow>[] = [
  {
    key: "category",
    header: "Category",
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
    header: "USD paid",
    align: "right",
    sortable: true,
    sortValue: (r) => r._usd,
    render: (r) => (
      <span className="font-medium text-amber-700/90">
        {formatUsdCents(r._usd, { compact: true })}
      </span>
    ),
  },
];

const recipientColumns: Column<RecipientRow>[] = [
  {
    key: "rank",
    header: "#",
    align: "right",
    sortable: true,
    sortValue: (r) => r.rank,
    render: (r) => <span className="text-xs text-stone-400">{r.rank}</span>,
  },
  {
    key: "recipient",
    header: "Recipient",
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
    header: "USD paid",
    align: "right",
    sortable: true,
    sortValue: (r) => r._usd,
    render: (r) => (
      <span className="font-medium text-amber-700/90">
        {formatUsdCents(r._usd, { compact: true })}
      </span>
    ),
  },
];

export function TotalsTables({
  categoryRows,
  recipientRows,
}: TotalsTablesProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="min-w-0">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          By category
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
    </div>
  );
}
