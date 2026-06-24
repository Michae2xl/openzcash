/**
 * Admin write path for ZCG/FPF proposals (gated by the middleware via ADMIN_APIS).
 *   POST   — create an authored proposal (origin='admin').
 *   PATCH  — edit a proposal (e.g. change status); locks the row so the next
 *            spreadsheet import does not overwrite it.
 *   DELETE — remove a proposal (admin rows for good; sheet rows reappear on the
 *            next import unless they were edited/locked first).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgProposals } from "@/lib/db/schema";
import { normalizeKey } from "@/lib/zcg/normalize";
import {
  proposalCreateSchema,
  proposalDeleteSchema,
  proposalPatchSchema,
} from "@/lib/zcg/admin/proposal-schema";

export const dynamic = "force-dynamic";

function usdToCents(usd: number | null | undefined): bigint | null {
  return usd == null ? null : BigInt(Math.round(usd * 100));
}
function clean(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
}
function fail(e: unknown) {
  return Response.json(
    { ok: false, error: e instanceof Error ? e.message : String(e) },
    { status: 400 },
  );
}

export async function POST(req: Request) {
  try {
    const p = proposalCreateSchema.parse(await req.json());
    const title = p.title.trim();
    await getDb()
      .insert(zcgProposals)
      .values({
        id: randomUUID(),
        program: p.program,
        title,
        titleKey: normalizeKey(title),
        status: p.status,
        statusRaw: p.status,
        applicantsRaw: clean(p.applicantsRaw),
        requestedUsdCents: usdToCents(p.requestedUsd),
        platformLink: clean(p.platformLink),
        forumLink: clean(p.forumLink),
        submittedDate: clean(p.submittedDate),
        country: clean(p.country),
        origin: "admin",
        sourceSheetGid: null,
        sourceRowIndex: null,
      });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const p = proposalPatchSchema.parse(await req.json());
    // Editing locks the row so a re-import never clobbers the admin's change.
    const patch: Record<string, unknown> = { locked: true };
    if (p.status !== undefined) {
      patch.status = p.status;
      patch.statusRaw = p.status;
    }
    if (p.title !== undefined) {
      const t = p.title.trim();
      patch.title = t;
      patch.titleKey = normalizeKey(t);
    }
    if (p.applicantsRaw !== undefined)
      patch.applicantsRaw = clean(p.applicantsRaw);
    if (p.requestedUsd !== undefined)
      patch.requestedUsdCents = usdToCents(p.requestedUsd);
    if (p.platformLink !== undefined)
      patch.platformLink = clean(p.platformLink);

    await getDb()
      .update(zcgProposals)
      .set(patch)
      .where(eq(zcgProposals.id, p.id));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = proposalDeleteSchema.parse(await req.json());
    await getDb().delete(zcgProposals).where(eq(zcgProposals.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
