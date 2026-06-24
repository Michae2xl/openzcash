/**
 * Resumo POR TESOURO (cada viewing key = um tesouro). Agrega os lançamentos da
 * reconciliação por `treasuryId` e casa com o saldo real (on-chain) da engine.
 *
 * O sistema "divide" o movimento por tesouro: cada viewing key importada vira um
 * tesouro independente, com seu saldo, entradas e saídas — mas o painel pode
 * consolidar todos numa visão única.
 */

import type { ViewingKeyRecord } from "../zcash/types";
import type { LedgerEntry } from "./reconciliation";

/** Rótulos amigáveis dos tipos de tesouro (chave técnica → exibição). */
export const TREASURY_TYPE_LABELS: Record<string, string> = {
  grants: "Grants",
  folha: "Folha de pagamento",
  distribuicao: "Distribuição",
  pessoal: "Pessoal",
  outro: "Outro",
};

export function treasuryTypeLabel(type: string | undefined): string {
  return TREASURY_TYPE_LABELS[type ?? "outro"] ?? "Outro";
}

export interface TreasurySummary {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  /** Saldo real on-chain (zatoshis), vindo da engine. */
  readonly balanceZat: bigint;
  /** Nº de transações observadas neste tesouro. */
  readonly txCount: number;
  /** Entradas EXTERNAS (de terceiros); não inclui transferências internas. */
  readonly inZat: bigint;
  /** Saídas EXTERNAS (a terceiros); não inclui transferências internas. */
  readonly outZat: bigint;
  /** Valor recebido/enviado entre tesouros próprios (à parte de inZat/outZat). */
  readonly internalInZat: bigint;
  readonly internalOutZat: bigint;
  readonly exceptionCount: number;
}

/** Constrói um resumo por tesouro a partir das viewing keys e dos lançamentos. */
export function summarizeTreasuries(
  viewingKeys: readonly ViewingKeyRecord[],
  entries: readonly LedgerEntry[],
): readonly TreasurySummary[] {
  return viewingKeys.map((vk) => {
    const own = entries.filter((e) => e.treasuryId === vk.id);
    let inZat = 0n;
    let outZat = 0n;
    let internalInZat = 0n;
    let internalOutZat = 0n;
    let exceptionCount = 0;
    for (const e of own) {
      // Componentes por-output já separam externo (terceiros) de interno (entre
      // tesouros) — inclusive numa tx mista; o unconfirmed conta como externo.
      inZat += e.extInZat;
      outZat += e.extOutZat;
      internalInZat += e.intInZat;
      internalOutZat += e.intOutZat;
      if (e.reconStatus === "exception") exceptionCount += 1;
    }
    return {
      id: vk.id,
      label: vk.accountLabel,
      type: vk.treasuryType ?? "outro",
      balanceZat: vk.balanceZat ?? 0n,
      txCount: own.filter((e) => e.txid).length,
      inZat,
      outZat,
      internalInZat,
      internalOutZat,
      exceptionCount,
    };
  });
}
