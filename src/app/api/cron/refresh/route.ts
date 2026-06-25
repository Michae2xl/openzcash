/**
 * Scheduled ZCG spreadsheet re-import. Hit by Vercel Cron (see vercel.json),
 * which sends `Authorization: Bearer ${CRON_SECRET}`. Not an admin route — it
 * is gated by the shared secret, not a session — so it stays out of ADMIN_APIS.
 */
import { timingSafeEqual } from "node:crypto";
import { refreshZcg } from "@/lib/zcg/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Constant-time Bearer-token check (mirrors the login route's comparison). */
function authorized(req: Request, secret: string): boolean {
  const a = Buffer.from(req.headers.get("authorization") ?? "", "utf8");
  const b = Buffer.from(`Bearer ${secret}`, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  if (!authorized(req, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const r = await refreshZcg();
    // Surface a real ok + per-tab results so cron monitoring catches a broken
    // import instead of seeing a blanket 200 even when every tab failed.
    return Response.json(
      {
        ok: r.ok,
        ms: r.ms,
        disbursements: r.disbursements,
        snapshots: r.snapshots,
        proposals: r.proposals,
        totals: r.totals,
      },
      { status: r.ok ? 200 : 502 },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
