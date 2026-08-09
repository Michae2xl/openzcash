import { recipientTotals } from "@/lib/zcg/disbursements-repo";
import { dataResponse } from "@/lib/api/serialize";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";

export const dynamic = "force-dynamic";

/** Public read: per-recipient totals across all grants and payments. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const all = await cached("api:recipients", LEDGER_TTL_MS, recipientTotals);
  // Default view is ecosystem money: keep anyone with external lines, and
  // report their external totals so a committee stipend never hides (or
  // inflates) a recipient who also maintains a funded project.
  const withInternal = p.get("internal") === "1";
  const rows = withInternal
    ? all
    : all.filter((r) => r.externalUsdCents > 0n || r.externalZecZat > 0n);

  const data = rows.map((r) => ({
    recipient: r.recipientName,
    usd: Number(withInternal ? r.usdCents : r.externalUsdCents) / 100,
    zec: Number(withInternal ? r.zecZat : r.externalZecZat) / 1e8,
    grants: r.grantCount,
    payments: r.paymentCount,
    lastPaid: r.lastPaid ?? "",
    isInternal: r.isInternal,
    hasInternalLines: r.hasInternal,
  }));

  return dataResponse(data, p.get("format"), "zcg-recipients", req);
}
