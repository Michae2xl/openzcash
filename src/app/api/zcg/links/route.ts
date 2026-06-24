/** Admin edit of ZCG config links (fixed keys; upsert by key). Gated via ADMIN_APIS. */
import { getDb } from "@/lib/db/client";
import { zcgLinks } from "@/lib/db/schema";
import { linkPatchSchema } from "@/lib/zcg/admin/governance-schema";
import { fail } from "@/lib/zcg/admin/respond";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  try {
    const p = linkPatchSchema.parse(await req.json());
    await getDb()
      .insert(zcgLinks)
      .values({ key: p.key, label: p.label ?? p.key, url: p.url })
      .onConflictDoUpdate({
        target: zcgLinks.key,
        set: { url: p.url, ...(p.label ? { label: p.label } : {}) },
      });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
