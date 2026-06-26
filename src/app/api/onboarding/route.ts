/**
 * POST /api/onboarding — recebe uma submissão de tesouro (viewing key sealed-box
 * ou endereço transparente), valida o convite e cria o tesouro.
 *
 * Rota PÚBLICA por design (terceiros cadastram o próprio tesouro), por isso é
 * blindada na borda: um convite (token) é OBRIGATÓRIO, o corpo é validado por
 * zod e há rate-limit por IP — sem isso, qualquer um poderia criar tesouros e
 * disparar scans caros anonimamente.
 */

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { onboardingInvites } from "@/lib/db/schema";
import { hitRateLimit } from "@/lib/auth/rate-limit";
import { createTreasuryFromOnboarding } from "@/lib/onboarding/create-treasury";
import { assertInviteUsable } from "@/lib/onboarding/invites";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  token: z.string().trim().min(1).nullish(),
  source: z.enum(["ufvk", "taddr"]),
  name: z.string().trim().min(1).max(120),
  treasuryType: z.string().trim().min(1).max(40),
  address: z.string().trim().max(512).nullish(),
  sealedKey: z.string().max(50_000).nullish(),
  birthHeight: z.number().int().min(0).max(50_000_000).nullish(),
});

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const rl = hitRateLimit(`onboarding:${ip}`);
    if (!rl.allowed)
      return Response.json(
        {
          ok: false,
          error: `Too many attempts. Try again in ${rl.retryAfterSec}s.`,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );

    const body = onboardingSchema.parse(await req.json());
    const token = body.token?.trim();
    if (!token)
      throw new Error("An invite token is required to register a treasury.");
    await assertInviteUsable(token);

    // Internal ops: don't leak DB/schema errors to the public caller.
    let result;
    try {
      result = await createTreasuryFromOnboarding({
        source: body.source,
        name: body.name,
        treasuryType: body.treasuryType,
        address: body.address ?? undefined,
        sealedKey: body.sealedKey ?? undefined,
        birthHeight: body.birthHeight ?? undefined,
      });

      await getDb()
        .update(onboardingInvites)
        .set({ status: "used", usedAt: new Date(), treasuryId: result.id })
        .where(eq(onboardingInvites.token, token));
    } catch (inner) {
      console.error("[onboarding] internal failure:", inner);
      throw new Error("Could not register the treasury. Please try again.");
    }

    return Response.json({ ok: true, result });
  } catch (e) {
    if (!(e instanceof z.ZodError)) console.error("[onboarding] failed:", e);
    const error =
      e instanceof z.ZodError
        ? "Invalid submission."
        : e instanceof Error
          ? e.message
          : "Bad request.";
    return Response.json({ ok: false, error }, { status: 400 });
  }
}
