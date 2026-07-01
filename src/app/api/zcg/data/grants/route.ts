import { listGrants } from "@/lib/zcg/grants-repo";
import { dataResponse } from "@/lib/api/serialize";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";

export const dynamic = "force-dynamic";

/** Public read: per-grant aggregation (milestones, paid, status). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const search = p.get("search") ?? undefined;
  const program = p.get("program") ?? undefined;

  // The unfiltered list is the hot path (UI + skill/API consumers) — serve it
  // from the in-process memo instead of re-aggregating in Postgres per request.
  const rows =
    search || program
      ? await listGrants({ search, program })
      : await cached("api:grants", LEDGER_TTL_MS, () => listGrants({}));

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

  return dataResponse(data, p.get("format"), "zcg-grants", req);
}
