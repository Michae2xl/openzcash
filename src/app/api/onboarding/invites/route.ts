/**
 * POST /api/onboarding/invites — admin gera ou revoga um convite de onboarding.
 *   { action: "create", label, expiresInDays? } → { token }
 *   { action: "revoke", token }                 → { ok }
 */

import { createInvite, revokeInvite } from "@/lib/onboarding/invites";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: "create" | "revoke";
      label?: string;
      expiresInDays?: number;
      token?: string;
    };

    if (body.action === "create") {
      const token = await createInvite(body.label ?? "", body.expiresInDays);
      return Response.json({ ok: true, token });
    }
    if (body.action === "revoke" && body.token) {
      await revokeInvite(body.token);
      return Response.json({ ok: true });
    }
    return Response.json(
      { ok: false, error: "Ação inválida." },
      { status: 400 },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
