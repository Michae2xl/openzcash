/** Admin CRUD for ZCG meeting minutes (gated via ADMIN_APIS). */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgMeetings } from "@/lib/db/schema";
import {
  meetingCreateSchema,
  meetingDeleteSchema,
  meetingPatchSchema,
} from "@/lib/zcg/admin/governance-schema";
import { fail } from "@/lib/zcg/admin/respond";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const p = meetingCreateSchema.parse(await req.json());
    await getDb().insert(zcgMeetings).values({
      id: randomUUID(),
      title: p.title,
      meetingDate: p.meetingDate,
      url: p.url,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const p = meetingPatchSchema.parse(await req.json());
    const set: Record<string, unknown> = {};
    if (p.title !== undefined) set.title = p.title;
    if (p.meetingDate !== undefined) set.meetingDate = p.meetingDate;
    if (p.url !== undefined) set.url = p.url;
    await getDb().update(zcgMeetings).set(set).where(eq(zcgMeetings.id, p.id));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = meetingDeleteSchema.parse(await req.json());
    await getDb().delete(zcgMeetings).where(eq(zcgMeetings.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
