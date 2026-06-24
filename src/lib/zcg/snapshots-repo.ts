/**
 * Queries de LEITURA dos snapshots ao vivo do ZCG (Fase 3) para as telas.
 *
 * Lê direto das tabelas (NÃO importa o importador). Colunas em zatoshis e
 * centavos de USD vêm do Postgres como `bigint` e são reexpostas como `bigint`
 * no retorno — usando `sql<string>` + `BigInt(...)` no mesmo estilo de
 * `disbursements-repo.ts` para manter a precisão de int64.
 *
 * Domínio: há DOIS níveis (grant-level × milestone-level) e DUAS moedas
 * (USD em centavos, ZEC em zatoshis). O orçamento discricionário tem USD e ZEC
 * DIVERGENTES — não reconciliar como a mesma conta. CACAO da Maya NÃO é ZEC.
 */

import { desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  zcgBalanceSnapshots,
  zcgBudgetSnapshots,
  zcgMayaTransfers,
} from "@/lib/db/schema";

/** Converte coluna bigint (string|null do driver) para `bigint | null`. */
function toBigint(value: string | null): bigint | null {
  return value === null ? null : BigInt(value);
}

/** Snapshot de saldo de um escopo, com colunas bigint já normalizadas. */
export type SnapshotRow = {
  id: string;
  scope: string;
  capturedAt: Date;
  blockHeight: bigint | null;
  blockTime: Date | null;
  status: string | null;
  zecBalanceZat: bigint | null;
  usdCashBalanceCents: bigint | null;
  zecusdPriceCents: bigint | null;
  usdValueOfZecCents: bigint | null;
  usdTotalHoldingsCents: bigint | null;
  usdGrantsApprovedCents: bigint | null;
  usdMilestonesPaidCents: bigint | null;
  futureGrantLiabilitiesCents: bigint | null;
  zecReceivablesZat: bigint | null;
  sourceSheetGid: string;
  importedAt: Date;
};

/** Colunas bigint expostas como texto pelo driver, prontas p/ `BigInt()`. */
const balanceColumns = {
  id: zcgBalanceSnapshots.id,
  scope: zcgBalanceSnapshots.scope,
  capturedAt: zcgBalanceSnapshots.capturedAt,
  blockHeight: sql<string | null>`${zcgBalanceSnapshots.blockHeight}`,
  blockTime: zcgBalanceSnapshots.blockTime,
  status: zcgBalanceSnapshots.status,
  zecBalanceZat: sql<string | null>`${zcgBalanceSnapshots.zecBalanceZat}`,
  usdCashBalanceCents: sql<
    string | null
  >`${zcgBalanceSnapshots.usdCashBalanceCents}`,
  zecusdPriceCents: sql<string | null>`${zcgBalanceSnapshots.zecusdPriceCents}`,
  usdValueOfZecCents: sql<
    string | null
  >`${zcgBalanceSnapshots.usdValueOfZecCents}`,
  usdTotalHoldingsCents: sql<
    string | null
  >`${zcgBalanceSnapshots.usdTotalHoldingsCents}`,
  usdGrantsApprovedCents: sql<
    string | null
  >`${zcgBalanceSnapshots.usdGrantsApprovedCents}`,
  usdMilestonesPaidCents: sql<
    string | null
  >`${zcgBalanceSnapshots.usdMilestonesPaidCents}`,
  futureGrantLiabilitiesCents: sql<
    string | null
  >`${zcgBalanceSnapshots.futureGrantLiabilitiesCents}`,
  zecReceivablesZat: sql<
    string | null
  >`${zcgBalanceSnapshots.zecReceivablesZat}`,
  sourceSheetGid: zcgBalanceSnapshots.sourceSheetGid,
  importedAt: zcgBalanceSnapshots.importedAt,
};

/** Linha crua (colunas bigint como string) → `SnapshotRow` normalizado. */
function mapBalanceRow(r: {
  id: string;
  scope: string;
  capturedAt: Date;
  blockHeight: string | null;
  blockTime: Date | null;
  status: string | null;
  zecBalanceZat: string | null;
  usdCashBalanceCents: string | null;
  zecusdPriceCents: string | null;
  usdValueOfZecCents: string | null;
  usdTotalHoldingsCents: string | null;
  usdGrantsApprovedCents: string | null;
  usdMilestonesPaidCents: string | null;
  futureGrantLiabilitiesCents: string | null;
  zecReceivablesZat: string | null;
  sourceSheetGid: string;
  importedAt: Date;
}): SnapshotRow {
  return {
    id: r.id,
    scope: r.scope,
    capturedAt: r.capturedAt,
    blockHeight: toBigint(r.blockHeight),
    blockTime: r.blockTime,
    status: r.status,
    zecBalanceZat: toBigint(r.zecBalanceZat),
    usdCashBalanceCents: toBigint(r.usdCashBalanceCents),
    zecusdPriceCents: toBigint(r.zecusdPriceCents),
    usdValueOfZecCents: toBigint(r.usdValueOfZecCents),
    usdTotalHoldingsCents: toBigint(r.usdTotalHoldingsCents),
    usdGrantsApprovedCents: toBigint(r.usdGrantsApprovedCents),
    usdMilestonesPaidCents: toBigint(r.usdMilestonesPaidCents),
    futureGrantLiabilitiesCents: toBigint(r.futureGrantLiabilitiesCents),
    zecReceivablesZat: toBigint(r.zecReceivablesZat),
    sourceSheetGid: r.sourceSheetGid,
    importedAt: r.importedAt,
  };
}

/** Snapshot mais recente (maior `capturedAt`) de um escopo, ou null. */
export async function latestSnapshot(
  scope: string,
): Promise<SnapshotRow | null> {
  const db = getDb();
  const [row] = await db
    .select(balanceColumns)
    .from(zcgBalanceSnapshots)
    .where(sql`${zcgBalanceSnapshots.scope} = ${scope}`)
    .orderBy(desc(zcgBalanceSnapshots.capturedAt))
    .limit(1);

  return row ? mapBalanceRow(row) : null;
}

/**
 * O snapshot mais recente de CADA escopo.
 *
 * Usa `distinct on (scope)` do Postgres: o `order by scope, captured_at desc`
 * garante que a 1ª linha de cada grupo é a mais recente, e o `distinct on`
 * descarta as demais.
 */
export async function allLatestSnapshots(): Promise<SnapshotRow[]> {
  const db = getDb();
  const rows = await db
    .selectDistinctOn([zcgBalanceSnapshots.scope], balanceColumns)
    .from(zcgBalanceSnapshots)
    .orderBy(zcgBalanceSnapshots.scope, desc(zcgBalanceSnapshots.capturedAt));

  return rows.map(mapBalanceRow);
}

/** Uma das três linhas do bloco de orçamento discricionário. */
export type BudgetRow = {
  label: string;
  usdCents: bigint;
  zecZat: bigint;
};

/**
 * As 3 linhas mais recentes do orçamento (`annual_budget`, `spent_to_date`,
 * `budget_remaining`). USD e ZEC DIVERGEM por desenho — não reconciliar.
 */
export async function budgetSnapshot(): Promise<BudgetRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      label: zcgBudgetSnapshots.label,
      usdCents: sql<string>`coalesce(${zcgBudgetSnapshots.usdCents}, 0)`,
      zecZat: sql<string>`coalesce(${zcgBudgetSnapshots.zecZat}, 0)`,
      capturedAt: zcgBudgetSnapshots.capturedAt,
    })
    .from(zcgBudgetSnapshots)
    .orderBy(
      sql`${zcgBudgetSnapshots.label}`,
      desc(zcgBudgetSnapshots.capturedAt),
    );

  // 1ª linha (mais recente) por label.
  const seen = new Set<string>();
  const latest: BudgetRow[] = [];
  for (const r of rows) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    latest.push({
      label: r.label,
      usdCents: BigInt(r.usdCents),
      zecZat: BigInt(r.zecZat),
    });
  }

  return latest;
}

/** Aporte à LP Maya/THORChain — CACAO é unidade própria, NÃO ZEC. */
export type MayaTransferRow = {
  id: string;
  project: string | null;
  amountUsdCents: bigint | null;
  transferredAt: string | null;
  zecTransferredZat: bigint | null;
  zecUsdPriceCents: bigint | null;
};

/** Lista de aportes à liquidez Maya. */
export async function mayaTransfers(): Promise<MayaTransferRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: zcgMayaTransfers.id,
      project: zcgMayaTransfers.project,
      amountUsdCents: sql<string | null>`${zcgMayaTransfers.amountUsdCents}`,
      transferredAt: zcgMayaTransfers.transferredAt,
      zecTransferredZat: sql<
        string | null
      >`${zcgMayaTransfers.zecTransferredZat}`,
      zecUsdPriceCents: sql<
        string | null
      >`${zcgMayaTransfers.zecUsdPriceCents}`,
    })
    .from(zcgMayaTransfers)
    .orderBy(sql`${zcgMayaTransfers.transferredAt} desc nulls last`);

  return rows.map((r) => ({
    id: r.id,
    project: r.project,
    amountUsdCents: toBigint(r.amountUsdCents),
    transferredAt: r.transferredAt,
    zecTransferredZat: toBigint(r.zecTransferredZat),
    zecUsdPriceCents: toBigint(r.zecUsdPriceCents),
  }));
}
