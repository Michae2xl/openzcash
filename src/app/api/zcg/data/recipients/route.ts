import { recipientTotals } from "@/lib/zcg/disbursements-repo";
import { dataResponse } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";

/** Public read: per-recipient totals across all grants and payments. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const all = await recipientTotals();
  const rows =
    p.get("internal") === "1" ? all : all.filter((r) => !r.isInternal);

  const data = rows.map((r) => ({
    recipient: r.recipientName,
    usd: Number(r.usdCents) / 100,
    zec: Number(r.zecZat) / 1e8,
    grants: r.grantCount,
    payments: r.paymentCount,
    lastPaid: r.lastPaid ?? "",
    isInternal: r.isInternal,
  }));

  return dataResponse(data, p.get("format"), "zcg-recipients");
}
