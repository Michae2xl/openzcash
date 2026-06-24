/**
 * Seleciona a implementação do ZcashGateway conforme a configuração.
 *  - "mock"  → dataset embutido (dev)
 *  - "zkool" → zkool2 via GraphQL (recomendado: UFVK watch-only + FROST)
 *  - "real"  → zallet via JSON-RPC (limitado: não importa UFVK)
 */

import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { viewingKeys } from "@/lib/db/schema";
import type { ZcashGateway } from "./gateway";
import { MockZcashGateway } from "./mock/mock-gateway";
import { createZalletGateway } from "./real/zallet-gateway";
import { createZkoolGateway } from "./real/zkool-gateway";
import {
  TransparentLwdGateway,
  type TransparentTreasury,
} from "./real/transparent-gateway";

export function getZcashGateway(): ZcashGateway {
  switch (getEnv().ZCASH_GATEWAY) {
    case "zkool":
      return createZkoolGateway();
    case "real":
      return createZalletGateway();
    default:
      return new MockZcashGateway();
  }
}

/**
 * Tesouros TRANSPARENTES (endereços públicos, sem viewing key) auditados via
 * lightwalletd. Piloto: o Dev Fund Disbursement (ZIP-271). Futuramente alimentado
 * pelo onboarding. Lista vazia desativa a fonte transparente.
 */
const SEED_TRANSPARENT: readonly TransparentTreasury[] = [
  {
    id: "t-devfund",
    address: "t3ev37Q2uL1sfTsiJQJiWJoFzQpDhmnUwYo",
    name: "Dev Fund (ZIP-271)",
    treasuryType: "distribuicao",
    birthHeight: 3146000,
  },
];

export async function getTransparentGateway(): Promise<TransparentLwdGateway | null> {
  // Seed (piloto) + tesouros transparentes cadastrados via onboarding (Postgres).
  const byId = new Map<string, TransparentTreasury>();
  for (const t of SEED_TRANSPARENT) byId.set(t.id, t);
  try {
    const rows = await getDb()
      .select()
      .from(viewingKeys)
      .where(eq(viewingKeys.kind, "taddr"));
    for (const r of rows) {
      if (!r.address) continue;
      byId.set(r.id, {
        id: r.id,
        address: r.address,
        name: r.accountLabel,
        treasuryType: r.treasuryType,
        birthHeight: r.birthHeight ?? 0,
      });
    }
  } catch {
    // Postgres indisponível → usa só o seed.
  }
  const treasuries = [...byId.values()];
  if (treasuries.length === 0) return null;
  const url = process.env.LWD_URL ?? "zec.rocks:443";
  return new TransparentLwdGateway(url, treasuries);
}
