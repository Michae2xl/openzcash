import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import {
  listDisbursements,
  overriddenDisbursementIds,
} from "@/lib/zcg/disbursements-repo";
import { disbTypeLabel } from "@/lib/zcg/format";
import { getIsAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { DisbursementsTable, type DisbTableRow } from "./disbursements-table";
import { NewDisbursementForm } from "./disbursement-admin";

const money = (cents: bigint | null, div: number) =>
  cents == null ? "" : String(Number(cents) / div);

export const dynamic = "force-dynamic";
export const metadata = { title: "ZCG Disbursements · ZBO" };

const SHEETS: { id?: string; label: string }[] = [
  { id: undefined, label: "All" },
  { id: "grants_disbursed", label: "Grants" },
  { id: "ic_payments", label: "Contractors" },
  { id: "coinholder_grants", label: "Coinholder" },
  { id: "discretionary", label: "Discretionary" },
  { id: "monthly", label: "Monthly" },
];

export default async function DesembolsosPage({
  searchParams,
}: {
  searchParams: Promise<{ sheet?: string; grant?: string }>;
}) {
  const { sheet, grant } = await searchParams;
  const [isAdmin, rows, overridden] = await Promise.all([
    getIsAdmin(),
    listDisbursements({ sheet, grant, limit: 400 }),
    overriddenDisbursementIds(),
  ]);

  const tableRows: DisbTableRow[] = rows.map((d) => {
    const zec = d.zecDisbursedZat;
    const isClawback = zec != null && zec < 0n;
    return {
      id: d.id,
      recipient: d.recipientNameRaw,
      type: disbTypeLabel(d.disbursementType),
      detail: d.project ?? d.deliverable ?? "",
      milestoneSeq: d.milestoneSeq,
      category: d.category ?? "",
      status: d.grantStatus,
      date: d.paidOutDate ?? d.paidOutRaw ?? "",
      _usdCents: d.amountUsdCents != null ? Number(d.amountUsdCents) : null,
      _usd: d.amountUsdCents != null ? Number(d.amountUsdCents) : 0,
      _zecZat: zec != null ? Number(zec) : null,
      _zec: zec != null ? Number(zec) : 0,
      isClawback,
      settlementAsset: d.settlementAsset,
      origin: d.origin,
      edited: overridden.has(d.id),
      edit: {
        recipientNameRaw: d.recipientNameRaw,
        sourceSheet: d.sourceSheet,
        project: d.project ?? "",
        category: d.category ?? "",
        milestoneLabel: d.milestoneLabel ?? "",
        grantStatus: d.grantStatus ?? "",
        amountUsd: money(d.amountUsdCents, 100),
        usdDisbursed: money(d.usdDisbursedCents, 100),
        zecDisbursed: money(d.zecDisbursedZat, 1e8),
        paidOutDate: d.paidOutDate ?? "",
        isPaid: d.isPaid,
      },
    };
  });

  return (
    <>
      <PageHeader
        title="Disbursements"
        subtitle="ZCG off-chain ledger: each row is a milestone or payment (grant, contractor, bounty or monthly transfer) with budgeted USD, disbursed ZEC and the day's rate."
        actions={isAdmin ? <NewDisbursementForm /> : undefined}
      />

      {grant ? (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-sm text-amber-800/80">
            Milestones for grant{" "}
            <span className="font-medium text-amber-800">{grant}</span>
          </p>
          <Link
            href="/zcg/grants"
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            All grants
          </Link>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-2">
        {SHEETS.map((s) => {
          const active = sheet === s.id || (!sheet && !s.id);
          return (
            <Link
              key={s.id ?? "all"}
              href={
                s.id ? `/zcg/desembolsos?sheet=${s.id}` : "/zcg/desembolsos"
              }
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-medium shadow-sm ring-1 ring-inset transition",
                active
                  ? "bg-amber-500/15 text-amber-700 shadow-amber-900/5 ring-amber-500/40"
                  : "bg-white text-stone-600 shadow-stone-300/30 ring-stone-200 hover:text-stone-900 hover:ring-stone-300",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <DisbursementsTable rows={tableRows} isAdmin={isAdmin} />
      </Card>

      <p className="mt-4 text-xs text-stone-400">
        {rows.length} disbursements{" "}
        {sheet ? "in this category" : "(most recent)"} ·{" "}
        <span className="text-stone-500">from spreadsheet</span> = mirrored from
        the ZCG public sheet;{" "}
        <span className="text-amber-700">admin entry</span> /{" "}
        <span className="text-amber-700">admin-edited</span> = added or
        corrected in this back-office
      </p>
    </>
  );
}
