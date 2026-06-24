/**
 * Scheduled ZCG spreadsheet re-import. Hit by Vercel Cron (see vercel.json),
 * which sends `Authorization: Bearer ${CRON_SECRET}`. Not an admin route — it
 * is gated by the shared secret, not a session — so it stays out of ADMIN_APIS.
 */
import { refreshZcg } from "@/lib/zcg/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { ms } = await refreshZcg();
    return Response.json({ ok: true, ms });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
