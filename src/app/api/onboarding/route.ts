/**
 * POST /api/onboarding — recebe uma submissão de tesouro (viewing key sealed-box
 * ou endereço transparente), valida o convite e cria o tesouro.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { onboardingInvites } from "@/lib/db/schema";
import {
  createTreasuryFromOnboarding,
  type OnboardingInput,
} from "@/lib/onboarding/create-treasury";
import { assertInviteUsable } from "@/lib/onboarding/invites";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as OnboardingInput & { token?: string };

    if (body.token) await assertInviteUsable(body.token);

    const result = await createTreasuryFromOnboarding(body);

    if (body.token) {
      await getDb()
        .update(onboardingInvites)
        .set({ status: "used", usedAt: new Date(), treasuryId: result.id })
        .where(eq(onboardingInvites.token, body.token));
    }

    return Response.json({ ok: true, result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
