/**
 * Cria um tesouro a partir de uma submissão de onboarding.
 *  - taddr: endereço transparente público → grava em viewing_keys e escaneia via lwd.
 *  - ufvk:  viewing key shielded → decifra o sealed-box, importa watch-only no zkool.
 *
 * Read-only: nunca recebe nem manuseia spend keys.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { viewingKeys } from "@/lib/db/schema";
import { getTransparentGateway } from "@/lib/zcash/provider";
import { runScan } from "@/lib/zcash/scan/scanner";
import { createZkoolGateway } from "@/lib/zcash/real/zkool-gateway";
import { openSealed } from "./seal";

const TYPES = new Set(["grants", "folha", "distribuicao", "pessoal", "outro"]);

export interface OnboardingInput {
  readonly source: "ufvk" | "taddr";
  readonly name: string;
  readonly treasuryType: string;
  readonly address?: string;
  readonly sealedKey?: string;
  readonly birthHeight?: number;
}

export interface OnboardingResult {
  readonly id: string;
  readonly kind: "ufvk" | "taddr";
  readonly name: string;
}

export async function createTreasuryFromOnboarding(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const treasuryType = TYPES.has(input.treasuryType)
    ? input.treasuryType
    : "outro";
  const name = input.name.trim() || "Treasury";
  const birthHeight = Number.isFinite(input.birthHeight)
    ? Number(input.birthHeight)
    : 0;

  if (input.source === "taddr") {
    const address = (input.address ?? "").trim();
    if (!/^t[13][a-zA-Z0-9]{25,}$/.test(address))
      throw new Error(
        "Invalid transparent address (must start with t1 or t3).",
      );
    const id = `t-${randomUUID().slice(0, 8)}`;
    await getDb()
      .insert(viewingKeys)
      .values({
        id,
        accountLabel: name,
        kind: "taddr",
        pools: ["transparent"],
        ufvkMasked: `${address} · public address (no secret)`,
        scope: "transparent audit (public address)",
        status: "active",
        treasuryType,
        address,
        birthHeight,
      });
    // Scan best-effort: o tesouro já está gravado; se o lwd demorar/falhar, o
    // próximo scan (loadAudit / /api/scan) completa.
    const tg = await getTransparentGateway();
    if (tg) {
      try {
        await runScan(tg);
      } catch {
        // ignorado de propósito
      }
    }
    return { id, kind: "taddr", name };
  }

  // Viewing key (shielded): decifra o sealed-box e importa watch-only no zkool.
  const ufvk = (await openSealed(input.sealedKey ?? "")).trim();
  if (!/^(uview1|zxviews1|uivk1)/.test(ufvk))
    throw new Error("Invalid viewing key (expected uview1…/zxviews1…).");
  const zkool = createZkoolGateway();
  const idAccount = await zkool.importViewingKey(ufvk, name, birthHeight);
  await zkool.synchronize([idAccount]);
  await runScan(zkool);
  await getDb()
    .update(viewingKeys)
    .set({ treasuryType })
    .where(eq(viewingKeys.id, String(idAccount)));
  return { id: String(idAccount), kind: "ufvk", name };
}
