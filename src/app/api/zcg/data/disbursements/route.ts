import { listDisbursements } from "@/lib/zcg/disbursements-repo";
import { dataResponse } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";

/** Public read: the disbursement ledger, same filters the UI uses. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const rows = await listDisbursements({
    sheet: p.get("sheet") ?? undefined,
    grant: p.get("grant") ?? undefined,
    category: p.get("category") ?? undefined,
    type: p.get("type") ?? undefined,
    search: p.get("search") ?? undefined,
    limit: Math.min(Number(p.get("limit") ?? 500) || 500, 2000),
  });

  const data = rows.map((d) => ({
    id: d.id,
    recipient: d.recipientNameRaw,
    project: d.project ?? "",
    category: d.category ?? "",
    type: d.disbursementType,
    status: d.grantStatus ?? "",
    milestone: d.milestoneLabel ?? "",
    paidOutDate: d.paidOutDate ?? "",
    amountUsd: d.amountUsdCents != null ? Number(d.amountUsdCents) / 100 : null,
    zec: d.zecDisbursedZat != null ? Number(d.zecDisbursedZat) / 1e8 : null,
    sourceSheet: d.sourceSheet,
    isPaid: d.isPaid,
  }));

  return dataResponse(data, p.get("format"), "zcg-disbursements");
}
