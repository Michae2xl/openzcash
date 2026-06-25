/**
 * Convites de onboarding: o admin gera um link compartilhável (com token) e envia
 * a um terceiro, que cadastra o próprio tesouro em /onboarding?token=…
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { onboardingInvites } from "@/lib/db/schema";

export type InviteStatus = "pending" | "used" | "revoked" | "expired";

export interface InviteRow {
  readonly token: string;
  readonly label: string;
  readonly status: InviteStatus;
  readonly createdAt: string;
  readonly expiresAt: string | null;
  readonly usedAt: string | null;
  readonly treasuryId: string | null;
}

export async function createInvite(
  label: string,
  expiresInDays?: number,
): Promise<string> {
  const token = randomBytes(12).toString("base64url");
  const expiresAt =
    expiresInDays && expiresInDays > 0
      ? new Date(Date.now() + expiresInDays * 86_400_000)
      : null;
  await getDb()
    .insert(onboardingInvites)
    .values({ token, label: label.trim() || "Invite", expiresAt });
  return token;
}

export async function revokeInvite(token: string): Promise<void> {
  await getDb()
    .update(onboardingInvites)
    .set({ status: "revoked" })
    .where(eq(onboardingInvites.token, token));
}

/** Status efetivo, considerando expiração por data. */
function effectiveStatus(status: string, expiresAt: Date | null): InviteStatus {
  if (status === "pending" && expiresAt && expiresAt.getTime() < Date.now())
    return "expired";
  return status as InviteStatus;
}

export async function listInvites(): Promise<readonly InviteRow[]> {
  const rows = await getDb()
    .select()
    .from(onboardingInvites)
    .orderBy(desc(onboardingInvites.createdAt));
  return rows.map((r) => ({
    token: r.token,
    label: r.label,
    status: effectiveStatus(r.status, r.expiresAt),
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    usedAt: r.usedAt?.toISOString() ?? null,
    treasuryId: r.treasuryId,
  }));
}

/** Valida que um token pode ser usado (pending e não expirado). Lança se não. */
export async function assertInviteUsable(token: string): Promise<void> {
  const rows = await getDb()
    .select()
    .from(onboardingInvites)
    .where(eq(onboardingInvites.token, token));
  const inv = rows[0];
  if (!inv) throw new Error("Invite not found.");
  if (inv.status !== "pending")
    throw new Error("Invite already used or revoked.");
  if (inv.expiresAt && inv.expiresAt.getTime() < Date.now())
    throw new Error("Invite expired.");
}
