import { listGrants } from "@/lib/zcg/grants-repo";
import { dataResponse } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";

/** Public read: per-grant aggregation (milestones, paid, status). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const rows = await listGrants({
    search: p.get("search") ?? undefined,
    program: p.get("program") ?? undefined,
  });

  const data = rows.map((g) => ({
    grant: g.grantKey,
    grantee: g.grantee,
    category: g.category ?? "",
    program: g.program,
    status: g.status ?? "",
    milestones: g.milestoneCount,
    milestonesPaid: g.paidCount,
    usd: Number(g.usdCents) / 100,
    zec: Number(g.zecZat) / 1e8,
    firstPaid: g.firstPaid ?? "",
    lastPaid: g.lastPaid ?? "",
  }));

  return dataResponse(data, p.get("format"), "zcg-grants");
}
