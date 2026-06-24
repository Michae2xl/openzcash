import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgTotals } from "@/lib/db/schema";

export type TotalsRow = typeof zcgTotals.$inferSelect;

/** Pool de origem das duas abas de totais. */
export type TotalsPool = "zcg_grants" | "coinholder";

/**
 * Linha agregada por CATEGORIA (pivot da direita). USD em centavos (bigint).
 */
export type CategoryTotalRow = {
  pool: string;
  label: string;
  usdPaidToDateCents: bigint;
  capturedAt: Date;
  sourceSheetGid: string;
};

/**
 * Linha agregada por RECEBEDOR (pivot da esquerda). Inclui pipeline futuro e
 * a flag de bucket interno (orçamento discricionário / stipends do ZCG).
 */
export type RecipientTotalRow = {
  pool: string;
  label: string;
  usdPaidToDateCents: bigint;
  usdFuturePipelineCents: bigint | null;
  isInternalBucket: boolean;
  capturedAt: Date;
  sourceSheetGid: string;
};

/** Total geral ('Total') de uma aba — usado p/ integrity-check vs ledger. */
export type GrandTotalRow = {
  pool: string;
  usdPaidToDateCents: bigint;
  usdFuturePipelineCents: bigint | null;
  capturedAt: Date;
  sourceSheetGid: string;
};

/**
 * Filtra pela captura mais recente (maior capturedAt) do(s) pool(s) e rowKind.
 * O importador é delete+reinsert por gid, então normalmente há uma só captura,
 * mas a subquery garante consistência se houver snapshots históricos.
 */
function latestCapturedAt(pool: string | undefined, rowKind: string) {
  const conds = [eq(zcgTotals.rowKind, rowKind)];
  if (pool) conds.push(eq(zcgTotals.pool, pool));
  return getDb()
    .select({ maxAt: sql<string>`max(${zcgTotals.capturedAt})` })
    .from(zcgTotals)
    .where(and(...conds));
}

/** Totais por classificação (pivot direito). Ordenados por valor desc. */
export async function categoryTotals(
  pool?: TotalsPool,
): Promise<CategoryTotalRow[]> {
  const db = getDb();
  const conds = [eq(zcgTotals.rowKind, "classification_total")];
  if (pool) conds.push(eq(zcgTotals.pool, pool));
  conds.push(
    sql`${zcgTotals.capturedAt} = (${latestCapturedAt(pool, "classification_total")})`,
  );

  const rows = await db
    .select()
    .from(zcgTotals)
    .where(and(...conds))
    .orderBy(desc(zcgTotals.usdPaidToDateCents));

  return rows.map((r) => ({
    pool: r.pool,
    label: r.label,
    usdPaidToDateCents: r.usdPaidToDateCents,
    capturedAt: r.capturedAt,
    sourceSheetGid: r.sourceSheetGid,
  }));
}

/** Totais por recebedor (pivot esquerdo). Ordenados por valor pago desc. */
export async function recipientTotalsFromSheet(
  pool?: TotalsPool,
): Promise<RecipientTotalRow[]> {
  const db = getDb();
  const conds = [eq(zcgTotals.rowKind, "recipient_total")];
  if (pool) conds.push(eq(zcgTotals.pool, pool));
  conds.push(
    sql`${zcgTotals.capturedAt} = (${latestCapturedAt(pool, "recipient_total")})`,
  );

  const rows = await db
    .select()
    .from(zcgTotals)
    .where(and(...conds))
    .orderBy(desc(zcgTotals.usdPaidToDateCents));

  return rows.map((r) => ({
    pool: r.pool,
    label: r.label,
    usdPaidToDateCents: r.usdPaidToDateCents,
    usdFuturePipelineCents: r.usdFuturePipelineCents,
    isInternalBucket: r.isInternalBucket,
    capturedAt: r.capturedAt,
    sourceSheetGid: r.sourceSheetGid,
  }));
}

/**
 * Total geral ('Total') por aba — a métrica oficial da planilha p/ comparar com
 * a soma do ledger de desembolsos (integrity-check). Sem `pool` retorna ambas.
 */
export async function grandTotal(pool?: TotalsPool): Promise<GrandTotalRow[]> {
  const db = getDb();
  const conds = [eq(zcgTotals.rowKind, "grand_total")];
  if (pool) conds.push(eq(zcgTotals.pool, pool));
  conds.push(
    sql`${zcgTotals.capturedAt} = (${latestCapturedAt(pool, "grand_total")})`,
  );

  const rows = await db
    .select()
    .from(zcgTotals)
    .where(and(...conds))
    .orderBy(desc(zcgTotals.usdPaidToDateCents));

  return rows.map((r) => ({
    pool: r.pool,
    usdPaidToDateCents: r.usdPaidToDateCents,
    usdFuturePipelineCents: r.usdFuturePipelineCents,
    capturedAt: r.capturedAt,
    sourceSheetGid: r.sourceSheetGid,
  }));
}
