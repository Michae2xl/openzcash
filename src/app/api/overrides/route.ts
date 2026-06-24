/**
 * /api/overrides — admin re-classifica (POST) ou limpa (DELETE) uma transação.
 * Rota protegida (área admin). A reconciliação aplica o override por cima.
 */

import { clearOverride, setOverride } from "@/lib/accounting/overrides-repo";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { treasuryId, txid, classification, reason } = (await req.json()) as {
      treasuryId?: string;
      txid?: string;
      classification?: string;
      reason?: string;
    };
    if (!treasuryId || !txid || !classification)
      return Response.json(
        {
          ok: false,
          error: "treasuryId, txid e classification são obrigatórios.",
        },
        { status: 400 },
      );
    await setOverride(treasuryId, txid, classification, reason ?? "");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { treasuryId, txid } = (await req.json()) as {
      treasuryId?: string;
      txid?: string;
    };
    if (!treasuryId || !txid)
      return Response.json(
        { ok: false, error: "treasuryId e txid são obrigatórios." },
        { status: 400 },
      );
    await clearOverride(treasuryId, txid);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
