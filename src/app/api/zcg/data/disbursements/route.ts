import { listDisbursements } from "@/lib/zcg/disbursements-repo";
import { dataResponse } from "@/lib/api/serialize";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 2000;

/** Public read: the disbursement ledger, same filters the UI uses. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const filters = {
    sheet: p.get("sheet") ?? undefined,
    grant: p.get("grant") ?? undefined,
    category: p.get("category") ?? undefined,
    type: p.get("type") ?? undefined,
    search: p.get("search") ?? undefined,
  };
  const limit = Math.min(
    Number(p.get("limit") ?? MAX_LIMIT) || MAX_LIMIT,
    MAX_LIMIT,
  );

  // Unfiltered requests (the hot path) are served by slicing one cached
  // superset instead of hitting Postgres per request/limit combination.
  const hasFilters = Object.values(filters).some(Boolean);
  let total: number | undefined;
  let rows;
  if (hasFilters) {
    rows = await listDisbursements({ ...filters, limit });
  } else {
    const all = await cached("api:disbursements", LEDGER_TTL_MS, () =>
      listDisbursements({ limit: MAX_LIMIT }),
    );
    total = all.length;
    rows = all.slice(0, limit);
  }

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

  return dataResponse(data, p.get("format"), "zcg-disbursements", req, total);
}
