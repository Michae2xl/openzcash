/**
 * Admin treasury management (area protected by the middleware).
 *   POST   /api/treasuries — edit a treasury (name, type and/or public flag).
 *   DELETE /api/treasuries — remove a treasury and its scanned data.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  chainOutputs,
  chainTxs,
  classificationOverrides,
  scanState,
  viewingKeys,
  vkAccessLog,
} from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const TYPES = new Set(["grants", "folha", "distribuicao", "pessoal", "outro"]);

export async function POST(req: Request) {
  try {
    const { id, name, treasuryType, isPublic } = (await req.json()) as {
      id?: string;
      name?: string;
      treasuryType?: string;
      isPublic?: boolean;
    };
    if (!id)
      return Response.json(
        { ok: false, error: "id required" },
        { status: 400 },
      );

    const patch: {
      accountLabel?: string;
      treasuryType?: string;
      isPublic?: boolean;
    } = {};
    if (typeof name === "string" && name.trim())
      patch.accountLabel = name.trim();
    if (typeof treasuryType === "string" && TYPES.has(treasuryType))
      patch.treasuryType = treasuryType;
    if (typeof isPublic === "boolean") patch.isPublic = isPublic;
    if (Object.keys(patch).length === 0)
      return Response.json(
        { ok: false, error: "nothing to update" },
        { status: 400 },
      );

    await getDb().update(viewingKeys).set(patch).where(eq(viewingKeys.id, id));
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
    const { id } = (await req.json()) as { id?: string };
    if (!id)
      return Response.json(
        { ok: false, error: "id required" },
        { status: 400 },
      );

    const db = getDb();
    // Remove dependent rows first (vk_access_log has a hard FK; the rest key the
    // treasury by id), then the treasury itself.
    await db.transaction(async (tx) => {
      await tx.delete(vkAccessLog).where(eq(vkAccessLog.viewingKeyId, id));
      await tx.delete(chainOutputs).where(eq(chainOutputs.treasuryId, id));
      await tx.delete(chainTxs).where(eq(chainTxs.treasuryId, id));
      await tx
        .delete(classificationOverrides)
        .where(eq(classificationOverrides.treasuryId, id));
      await tx.delete(scanState).where(eq(scanState.id, id));
      await tx.delete(viewingKeys).where(eq(viewingKeys.id, id));
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
