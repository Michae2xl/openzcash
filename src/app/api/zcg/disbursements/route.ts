/**
 * Admin write path for ZCG disbursements (gated by the middleware via ADMIN_APIS).
 *
 * Disbursement ids are content hashes and the aggregations (Grants / Recipients /
 * Totals) run GROUP BY directly on the table — so edits are MATERIALIZED in place
 * (UPDATE + locked=true) to reflect everywhere, and the import preserves locked
 * rows. A `zcg_disbursement_overrides` row keeps the patch + the pristine original
 * (for revert) + the reason.
 *
 *   POST   — author a new disbursement (origin='admin').
 *   PATCH  — correct fields of any disbursement (locks it; logs the override).
 *   DELETE — admin rows: hard delete. Sheet rows: revert to pristine (needs an
 *            override) and unlock.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgDisbursementOverrides, zcgDisbursements } from "@/lib/db/schema";
import { normalizeKey } from "@/lib/zcg/normalize";
import {
  disbursementCreateSchema,
  disbursementDeleteSchema,
  disbursementPatchSchema,
} from "@/lib/zcg/admin/disbursement-schema";

export const dynamic = "force-dynamic";

// Columns whose jsonb-serialized value must be re-parsed to bigint on revert.
const BIGINT_COLS = new Set([
  "amountUsdCents",
  "usdDisbursedCents",
  "zecDisbursedZat",
]);

function usdToCents(usd: number | null | undefined): bigint | null {
  return usd == null ? null : BigInt(Math.round(usd * 100));
}
function zecToZat(zec: number | null | undefined): bigint | null {
  return zec == null ? null : BigInt(Math.round(zec * 1e8));
}
function clean(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
}
/** jsonb-safe (bigint -> string). */
function ser(v: unknown): unknown {
  return typeof v === "bigint" ? v.toString() : v;
}
/** Reverse of ser() for a given column. */
function deser(col: string, v: unknown): unknown {
  if (v == null) return null;
  if (BIGINT_COLS.has(col)) return BigInt(v as string);
  return v;
}
function fail(e: unknown) {
  return Response.json(
    { ok: false, error: e instanceof Error ? e.message : String(e) },
    { status: 400 },
  );
}

/** Build the column patch from validated input (only provided keys). */
function buildColumnPatch(p: Record<string, unknown>): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  if (p.recipientNameRaw !== undefined) {
    const name = String(p.recipientNameRaw).trim();
    set.recipientNameRaw = name;
    set.recipientKey = normalizeKey(name);
  }
  if (p.project !== undefined) set.project = clean(p.project as string);
  if (p.category !== undefined) set.category = clean(p.category as string);
  if (p.milestoneLabel !== undefined)
    set.milestoneLabel = clean(p.milestoneLabel as string);
  if (p.disbursementType !== undefined)
    set.disbursementType = String(p.disbursementType).trim();
  if (p.sourceSheet !== undefined) set.sourceSheet = p.sourceSheet;
  if (p.grantStatus !== undefined)
    set.grantStatus = clean(p.grantStatus as string);
  if (p.amountUsd !== undefined)
    set.amountUsdCents = usdToCents(p.amountUsd as number | null);
  if (p.usdDisbursed !== undefined)
    set.usdDisbursedCents = usdToCents(p.usdDisbursed as number | null);
  if (p.zecDisbursed !== undefined)
    set.zecDisbursedZat = zecToZat(p.zecDisbursed as number | null);
  if (p.paidOutDate !== undefined)
    set.paidOutDate = clean(p.paidOutDate as string);
  if (p.isPaid !== undefined) set.isPaid = p.isPaid;
  if (p.isInternal !== undefined) set.isInternal = p.isInternal;
  return set;
}

export async function POST(req: Request) {
  try {
    const p = disbursementCreateSchema.parse(await req.json());
    const set = buildColumnPatch(p as Record<string, unknown>);
    const name = p.recipientNameRaw.trim();
    await getDb()
      .insert(zcgDisbursements)
      .values({
        id: randomUUID(),
        sourceSheet: p.sourceSheet,
        disbursementType: clean(p.disbursementType) ?? p.sourceSheet,
        recipientNameRaw: name,
        recipientKey: normalizeKey(name),
        settlementAsset: (set.zecDisbursedZat as bigint | null) ? "ZEC" : "USD",
        paidOutRaw: clean(p.paidOutDate) ?? "",
        origin: "admin",
        locked: true,
        sourceSheetGid: null,
        sourceRowIndex: null,
        ...set,
      });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const p = disbursementPatchSchema.parse(await req.json());
    const db = getDb();
    const row = (
      await db
        .select()
        .from(zcgDisbursements)
        .where(eq(zcgDisbursements.id, p.id))
        .limit(1)
    ).at(0);
    if (!row) throw new Error("disbursement not found");

    const set = buildColumnPatch(p as Record<string, unknown>);
    const touched = Object.keys(set);
    if (touched.length === 0) throw new Error("no fields to update");

    // pristine values for the touched columns (jsonb-serialized)
    const freshOriginal: Record<string, unknown> = {};
    const patchJson: Record<string, unknown> = {};
    for (const col of touched) {
      freshOriginal[col] = ser((row as Record<string, unknown>)[col]);
      patchJson[col] = ser(set[col]);
    }

    await db
      .update(zcgDisbursements)
      .set({ ...set, locked: true })
      .where(eq(zcgDisbursements.id, p.id));

    const existing = (
      await db
        .select()
        .from(zcgDisbursementOverrides)
        .where(eq(zcgDisbursementOverrides.disbursementId, p.id))
        .limit(1)
    ).at(0);

    // Earliest pristine wins, so revert always restores the sheet value.
    const original = {
      ...freshOriginal,
      ...((existing?.original as Record<string, unknown>) ?? {}),
    };
    const patch = {
      ...((existing?.patch as Record<string, unknown>) ?? {}),
      ...patchJson,
    };

    if (existing) {
      await db
        .update(zcgDisbursementOverrides)
        .set({ patch, original, reason: clean(p.reason) })
        .where(eq(zcgDisbursementOverrides.id, existing.id));
    } else {
      await db.insert(zcgDisbursementOverrides).values({
        id: randomUUID(),
        disbursementId: p.id,
        patch,
        original,
        reason: clean(p.reason),
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = disbursementDeleteSchema.parse(await req.json());
    const db = getDb();
    const row = (
      await db
        .select()
        .from(zcgDisbursements)
        .where(eq(zcgDisbursements.id, id))
        .limit(1)
    ).at(0);
    if (!row) throw new Error("disbursement not found");

    if (row.origin === "admin") {
      await db.delete(zcgDisbursements).where(eq(zcgDisbursements.id, id));
      await db
        .delete(zcgDisbursementOverrides)
        .where(eq(zcgDisbursementOverrides.disbursementId, id));
      return Response.json({ ok: true, action: "deleted" });
    }

    // sheet row: revert to pristine via the stored override
    const ov = (
      await db
        .select()
        .from(zcgDisbursementOverrides)
        .where(eq(zcgDisbursementOverrides.disbursementId, id))
        .limit(1)
    ).at(0);
    if (!ov)
      throw new Error(
        "pristine sheet row — edit it instead of deleting (hiding sheet rows is not supported yet)",
      );

    const restore: Record<string, unknown> = { locked: false };
    for (const [col, val] of Object.entries(
      ov.original as Record<string, unknown>,
    )) {
      restore[col] = deser(col, val);
    }
    await db
      .update(zcgDisbursements)
      .set(restore)
      .where(eq(zcgDisbursements.id, id));
    await db
      .delete(zcgDisbursementOverrides)
      .where(eq(zcgDisbursementOverrides.disbursementId, id));
    return Response.json({ ok: true, action: "reverted" });
  } catch (e) {
    return fail(e);
  }
}
