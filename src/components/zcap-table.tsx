"use client";

import { DataTable, type Column } from "@/components/data-table";
import type { ZcapMember } from "@/lib/zcap/members";

const COLUMNS: Column<ZcapMember>[] = [
  {
    key: "name",
    header: "Member",
    sortable: true,
    filterable: true,
    render: (m) => <span className="font-medium text-stone-900">{m.name}</span>,
  },
  {
    key: "handle",
    header: "Forum / Twitter",
    mobileHidden: true,
    sortable: true,
    filterable: true,
    filterValue: (m) => m.handle,
    render: (m) =>
      m.handle ? (
        <span className="text-stone-600">@{m.handle}</span>
      ) : (
        <span className="text-stone-400">—</span>
      ),
  },
  {
    key: "joined",
    header: "Joined",
    align: "right",
    sortable: true,
    filterable: true,
    sortValue: (m) => m.joinedSort,
    render: (m) => (
      <span className="text-stone-600 tnum">{m.joined || "—"}</span>
    ),
  },
];

export function ZcapTable({ members }: { members: ZcapMember[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={members}
      rowKey={(m) => m.name}
      initialSort={{ key: "joined", dir: "desc" }}
      maxHeight="max-h-[60vh]"
    />
  );
}
