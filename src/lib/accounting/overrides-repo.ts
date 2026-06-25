/**
 * Re-classificações MANUAIS de transações (override sobre a auto-classificação).
 * Chaveadas por `${treasuryId}::${txid}` (mesmo formato do legKey da reconciliação).
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { classificationOverrides } from "@/lib/db/schema";

/** Classes que o admin pode aplicar manualmente. */
export const OVERRIDE_CLASSES = [
  "income",
  "external_payment",
  "grant_received",
  "bounty_received",
  "grant_paid",
  "bounty_paid",
  "viewkey_payout",
  "internal_out",
  "internal_in",
  "orphan_in",
  "orphan_out",
] as const;

export async function loadOverrides(): Promise<Map<string, string>> {
  const rows = await getDb().select().from(classificationOverrides);
  return new Map(
    rows.map((r) => [`${r.treasuryId}::${r.txid}`, r.classification]),
  );
}

export async function setOverride(
  treasuryId: string,
  txid: string,
  classification: string,
  reason: string,
): Promise<void> {
  if (!OVERRIDE_CLASSES.includes(classification as never))
    throw new Error("Invalid classification.");
  await getDb()
    .insert(classificationOverrides)
    .values({
      id: `ov-${randomUUID().slice(0, 8)}`,
      treasuryId,
      txid,
      classification,
      reason: reason.trim() || "—",
    })
    .onConflictDoUpdate({
      target: [
        classificationOverrides.treasuryId,
        classificationOverrides.txid,
      ],
      set: { classification, reason: reason.trim() || "—" },
    });
}

export async function clearOverride(
  treasuryId: string,
  txid: string,
): Promise<void> {
  await getDb()
    .delete(classificationOverrides)
    .where(
      and(
        eq(classificationOverrides.treasuryId, treasuryId),
        eq(classificationOverrides.txid, txid),
      ),
    );
}
