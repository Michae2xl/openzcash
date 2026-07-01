"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/data-table";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export type RecipientRow = {
  rank: number;
  recipientKey: string;
  recipient: string;
  grantCount: number;
  paymentCount: number;
  lastPaid: string;
  _usd: number;
  _zec: number;
};

interface RecipientsTableProps {
  rows: RecipientRow[];
}

const columns: Column<RecipientRow>[] = [
  {
    key: "rank",
    header: "#",
    sortable: true,
    sortValue: (r) => r.rank,
    render: (r) => (
      <span className="text-xs text-stone-500 tnum">{r.rank}</span>
    ),
  },
  {
    key: "recipient",
    header: "Recipient",
    sortable: true,
    filterable: true,
    filterValue: (r) => r.recipient,
    render: (r) => (
      <Link
        href={`/zcg/recipient?r=${encodeURIComponent(r.recipient)}`}
        title="See this recipient's milestones and payments"
        className="font-medium text-stone-900 hover:text-amber-700"
      >
        {r.recipient}
      </Link>
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
        {formatUsdCents(BigInt(r._usd))}
      </span>
    ),
  },
  {
    key: "zec",
    header: "ZEC",
    mobileHidden: true,
    align: "right",
    sortable: true,
    sortValue: (r) => r._zec,
    render: (r) =>
      r._zec !== 0 ? formatZec(BigInt(r._zec), { symbol: false }) : "·",
  },
  {
    key: "grantCount",
    header: "Grants",
    mobileHidden: true,
    align: "right",
    sortable: true,
    sortValue: (r) => r.grantCount,
    render: (r) => (
      <span className="font-medium text-stone-700">{r.grantCount || "·"}</span>
    ),
  },
  {
    key: "paymentCount",
    header: "Payments",
    mobileHidden: true,
    align: "right",
    sortable: true,
    sortValue: (r) => r.paymentCount,
    render: (r) => <span className="text-stone-600">{r.paymentCount}</span>,
  },
  {
    key: "lastPaid",
    header: "Last paid",
    mobileHidden: true,
    align: "right",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.lastPaid,
    filterValue: (r) => r.lastPaid,
    render: (r) => (
      <span className="whitespace-nowrap text-xs text-stone-600">
        {r.lastPaid || "·"}
      </span>
    ),
  },
];

export function RecipientsTable({ rows }: RecipientsTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      initialSort={{ key: "usd", dir: "desc" }}
      maxHeight="max-h-[68vh]"
    />
  );
}
