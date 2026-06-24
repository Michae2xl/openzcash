/** Admin CRUD for ZCG committee elections (gated via ADMIN_APIS). */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgElections } from "@/lib/db/schema";
import {
  electionCreateSchema,
  electionDeleteSchema,
  electionPatchSchema,
} from "@/lib/zcg/admin/governance-schema";
import { clean, fail } from "@/lib/zcg/admin/respond";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const p = electionCreateSchema.parse(await req.json());
    await getDb()
      .insert(zcgElections)
      .values({
        id: randomUUID(),
        title: p.title,
        status: p.status,
        seats: p.seats,
        url: p.url,
        nominationsClose: clean(p.nominationsClose),
        communityCall: clean(p.communityCall),
        votingCloses: clean(p.votingCloses),
        resultsBy: clean(p.resultsBy),
        elected: p.elected && p.elected.length ? p.elected : null,
        note: clean(p.note),
        sortOrder: p.sortOrder ?? 0,
      });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const p = electionPatchSchema.parse(await req.json());
    const set: Record<string, unknown> = {};
    if (p.title !== undefined) set.title = p.title;
    if (p.status !== undefined) set.status = p.status;
    if (p.seats !== undefined) set.seats = p.seats;
    if (p.url !== undefined) set.url = p.url;
    if (p.nominationsClose !== undefined)
      set.nominationsClose = clean(p.nominationsClose);
    if (p.communityCall !== undefined)
      set.communityCall = clean(p.communityCall);
    if (p.votingCloses !== undefined) set.votingCloses = clean(p.votingCloses);
    if (p.resultsBy !== undefined) set.resultsBy = clean(p.resultsBy);
    if (p.elected !== undefined)
      set.elected = p.elected && p.elected.length ? p.elected : null;
    if (p.note !== undefined) set.note = clean(p.note);
    if (p.sortOrder !== undefined) set.sortOrder = p.sortOrder;
    await getDb()
      .update(zcgElections)
      .set(set)
      .where(eq(zcgElections.id, p.id));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = electionDeleteSchema.parse(await req.json());
    await getDb().delete(zcgElections).where(eq(zcgElections.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
