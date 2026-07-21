"use client";

import { DataTable, type Column } from "@/components/data-table";

/** Serializable payout row (page computes url + numbers, no bigints). */
export type PayoutTableRow = {
  id: string;
  title: string;
  /** DAO DAO proposal when the title matched, else the treasury sheet. */
  url: string;
  paidUsd: number | null;
  pendingUsd: number | null;
  milestones: string[];
};

const usd = (v: number) => `$${v.toLocaleString("en-US")}`;

function Dots({ milestones }: { milestones: string[] }) {
  if (!milestones.length) return <span className="text-stone-300">·</span>;
  return (
    <span
      className="flex items-center justify-end gap-1"
      title="Milestones M1 · M2 · M3"
    >
      {milestones.map((m, i) => (
        <span
          key={i}
          className={
            /complete/i.test(m)
              ? "h-2 w-2 rounded-full bg-emerald-500"
              : "h-2 w-2 rounded-full bg-stone-200 ring-1 ring-inset ring-stone-300"
          }
          title={`M${i + 1}: ${m || "pending"}`}
        />
      ))}
    </span>
  );
}

const columns: Column<PayoutTableRow>[] = [
  {
    key: "title",
    header: "Grant",
    sortable: true,
    filterable: true,
    sortValue: (r) => r.title.toLowerCase(),
    filterValue: (r) => r.title,
    render: (r) => (
      <span className="block max-w-[15rem]">
        <a
          href={r.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate font-medium text-stone-900 hover:text-amber-700"
        >
          {r.title}
        </a>
        {r.paidUsd || r.pendingUsd ? (
          <span className="mt-1 block h-1 w-28 overflow-hidden rounded-full bg-stone-100">
            <span
              className="block h-full rounded-full bg-emerald-500"
              style={{
                width: `${((r.paidUsd ?? 0) / ((r.paidUsd ?? 0) + (r.pendingUsd ?? 0))) * 100}%`,
              }}
            />
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: "paidUsd",
    header: "Paid",
    align: "right",
    sortable: true,
    sortValue: (r) => r.paidUsd ?? -1,
    render: (r) =>
      r.paidUsd != null ? (
        <span className="whitespace-nowrap text-emerald-700 tnum">
          {usd(r.paidUsd)}
        </span>
      ) : (
        <span className="text-stone-300">·</span>
      ),
  },
  {
    key: "pendingUsd",
    header: "Committed",
    align: "right",
    sortable: true,
    sortValue: (r) => r.pendingUsd ?? -1,
    render: (r) =>
      r.pendingUsd != null ? (
        <span className="whitespace-nowrap text-amber-700/90 tnum">
          {usd(r.pendingUsd)}
        </span>
      ) : (
        <span className="text-stone-300">·</span>
      ),
  },
  {
    key: "milestones",
    header: "M1·M2·M3",
    align: "right",
    sortable: true,
    sortValue: (r) => r.milestones.filter((m) => /complete/i.test(m)).length,
    render: (r) => <Dots milestones={r.milestones} />,
  },
];

export function PayoutsTable({ rows }: { rows: PayoutTableRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      initialSort={{ key: "paidUsd", dir: "desc" }}
      maxHeight="max-h-[21rem]"
    />
  );
}
