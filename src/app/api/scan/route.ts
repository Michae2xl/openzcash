/**
 * POST /api/scan — dispara um scan (gateway configurado → Postgres).
 * Read-only sobre a chain; apenas persiste o que observa.
 */

import { getTransparentGateway, getZcashGateway } from "@/lib/zcash/provider";
import { runScan } from "@/lib/zcash/scan/scanner";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runScan(getZcashGateway());
    // Fontes transparentes (endereços públicos via lwd), se configuradas.
    const transparent = await getTransparentGateway();
    const transparentResult = transparent ? await runScan(transparent) : null;
    return Response.json({ ok: true, result, transparent: transparentResult });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
