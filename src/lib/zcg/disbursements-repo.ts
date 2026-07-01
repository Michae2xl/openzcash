import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgDisbursementOverrides, zcgDisbursements } from "@/lib/db/schema";

export type DisbRow = typeof zcgDisbursements.$inferSelect;

/** Ids of disbursements the admin has corrected (for the "edited" badge). */
export async function overriddenDisbursementIds(): Promise<Set<string>> {
  const rows = await getDb()
    .select({ id: zcgDisbursementOverrides.disbursementId })
    .from(zcgDisbursementOverrides);
  return new Set(rows.map((r) => r.id));
}

export type DisbFilters = {
  sheet?: string;
  type?: string;
  grant?: string;
  category?: string;
  search?: string;
  limit?: number;
};

export async function listDisbursements(
  opts: DisbFilters = {},
): Promise<DisbRow[]> {
  const db = getDb();
  const conds = [];
  if (opts.sheet) conds.push(eq(zcgDisbursements.sourceSheet, opts.sheet));
  if (opts.type) conds.push(eq(zcgDisbursements.disbursementType, opts.type));
  if (opts.grant) conds.push(eq(zcgDisbursements.project, opts.grant));
  if (opts.category) conds.push(eq(zcgDisbursements.category, opts.category));
  if (opts.search)
    conds.push(ilike(zcgDisbursements.recipientNameRaw, `%${opts.search}%`));

  return db
    .select()
    .from(zcgDisbursements)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(
      sql`${zcgDisbursements.paidOutDate} desc nulls last`,
      desc(zcgDisbursements.importedAt),
    )
    .limit(opts.limit ?? 250);
}

export type RecipientTotal = {
  recipientKey: string;
  recipientName: string;
  usdCents: bigint;
  zecZat: bigint;
  /** Nº de grants (projetos distintos) — não confundir com pagamentos. */
  grantCount: number;
  /** Nº de pagamentos efetivados (milestones pagos). */
  paymentCount: number;
  /** Nº de linhas no ledger (milestones + outros desembolsos). */
  lineCount: number;
  isInternal: boolean;
  lastPaid: string | null;
};

export async function recipientTotals(): Promise<RecipientTotal[]> {
  const db = getDb();
  const rows = await db
    .select({
      recipientKey: zcgDisbursements.recipientKey,
      recipientName: sql<string>`max(${zcgDisbursements.recipientNameRaw})`,
      usdCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}),0)`,
      zecZat: sql<string>`coalesce(sum(${zcgDisbursements.zecDisbursedZat}),0)`,
      grantCount: sql<number>`count(distinct ${zcgDisbursements.project}) filter (where ${zcgDisbursements.sourceSheet} in ('grants_disbursed','coinholder_grants'))::int`,
      paymentCount: sql<number>`count(*) filter (where ${zcgDisbursements.isPaid})::int`,
      lineCount: sql<number>`count(*)::int`,
      isInternal: sql<boolean>`bool_or(${zcgDisbursements.isInternal})`,
      lastPaid: sql<string | null>`max(${zcgDisbursements.paidOutDate})`,
    })
    .from(zcgDisbursements)
    .groupBy(zcgDisbursements.recipientKey)
    .orderBy(sql`sum(${zcgDisbursements.amountUsdCents}) desc nulls last`);

  return rows.map((r) => ({
    recipientKey: r.recipientKey,
    recipientName: r.recipientName,
    usdCents: BigInt(r.usdCents),
    zecZat: BigInt(r.zecZat),
    grantCount: r.grantCount,
    paymentCount: r.paymentCount,
    lineCount: r.lineCount,
    isInternal: r.isInternal,
    lastPaid: r.lastPaid,
  }));
}

export type CategoryTotal = {
  category: string;
  usdCents: bigint;
  count: number;
};

export type ZcgSummary = {
  /** Nº de linhas no ledger (milestones + IC + mensais + discricionários). */
  count: number;
  /** Nº de grants distintos (projetos). */
  grantCount: number;
  paidCount: number;
  recipientCount: number;
  usdTotalCents: bigint;
  zecTotalZat: bigint;
  byCategory: CategoryTotal[];
  bySheet: { sheet: string; count: number }[];
};

export async function disbursementsSummary(): Promise<ZcgSummary> {
  const db = getDb();

  const [totals] = await db
    .select({
      count: sql<number>`count(*)::int`,
      grantCount: sql<number>`count(distinct ${zcgDisbursements.project}) filter (where ${zcgDisbursements.sourceSheet} in ('grants_disbursed','coinholder_grants'))::int`,
      paidCount: sql<number>`count(*) filter (where ${zcgDisbursements.isPaid})::int`,
      recipientCount: sql<number>`count(distinct ${zcgDisbursements.recipientKey}) filter (where not ${zcgDisbursements.isInternal})::int`,
      usdTotalCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}),0)`,
      zecTotalZat: sql<string>`coalesce(sum(${zcgDisbursements.zecDisbursedZat}),0)`,
    })
    .from(zcgDisbursements);

  const byCategory = await db
    .select({
      category: sql<string>`coalesce(${zcgDisbursements.category},'(sem categoria)')`,
      usdCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}),0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(zcgDisbursements)
    .where(sql`not ${zcgDisbursements.isInternal}`)
    .groupBy(sql`coalesce(${zcgDisbursements.category},'(sem categoria)')`)
    .orderBy(sql`sum(${zcgDisbursements.amountUsdCents}) desc nulls last`)
    .limit(12);

  const bySheet = await db
    .select({
      sheet: zcgDisbursements.sourceSheet,
      count: sql<number>`count(*)::int`,
    })
    .from(zcgDisbursements)
    .groupBy(zcgDisbursements.sourceSheet)
    .orderBy(sql`count(*) desc`);

  return {
    count: totals?.count ?? 0,
    grantCount: totals?.grantCount ?? 0,
    paidCount: totals?.paidCount ?? 0,
    recipientCount: totals?.recipientCount ?? 0,
    usdTotalCents: BigInt(totals?.usdTotalCents ?? "0"),
    zecTotalZat: BigInt(totals?.zecTotalZat ?? "0"),
    byCategory: byCategory.map((c) => ({
      category: c.category,
      usdCents: BigInt(c.usdCents),
      count: c.count,
    })),
    bySheet,
  };
}
