import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgDisbursements } from "@/lib/db/schema";

/**
 * Derived analytics over the existing disbursement ledger — no new tables, just
 * aggregation the UI did not surface before (spend over time, and a ledger-vs-
 * published-totals cross-check). Kept separate from disbursements-repo so the
 * insight queries are easy to find and test.
 */

export type MonthSpend = { month: string; usdCents: bigint };

/**
 * Paid USD per calendar month across the whole ledger (grants, contractors,
 * discretionary, monthly). Only settled rows (is_paid + a paid date) count, so
 * this is money that actually went out — the basis for burn-rate and runway.
 */
export async function monthlySpend(): Promise<MonthSpend[]> {
  const rows = await getDb()
    .select({
      month: sql<string>`to_char(date_trunc('month', ${zcgDisbursements.paidOutDate}), 'YYYY-MM')`,
      usdCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}),0)`,
    })
    .from(zcgDisbursements)
    .where(
      sql`${zcgDisbursements.paidOutDate} is not null and ${zcgDisbursements.isPaid}`,
    )
    .groupBy(sql`date_trunc('month', ${zcgDisbursements.paidOutDate})`)
    .orderBy(sql`date_trunc('month', ${zcgDisbursements.paidOutDate})`);

  return rows.map((r) => ({ month: r.month, usdCents: BigInt(r.usdCents) }));
}

export type LedgerPoolSum = {
  pool: "zcg_grants" | "coinholder";
  usdCents: bigint;
};

/**
 * Sum of the paid ledger, split into the same two pools the published totals
 * use (coinholder vs. everything-else = ZCG). Compared against the imported
 * grand_total on the totals page, this turns the "matches the sum of
 * categories" claim into a computed self-audit.
 */
export async function ledgerSumByPool(): Promise<LedgerPoolSum[]> {
  const rows = await getDb()
    .select({
      isCoinholder: sql<boolean>`${zcgDisbursements.sourceSheet} = 'coinholder_grants'`,
      usdCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}) filter (where ${zcgDisbursements.isPaid}),0)`,
    })
    .from(zcgDisbursements)
    .groupBy(sql`${zcgDisbursements.sourceSheet} = 'coinholder_grants'`);

  return rows.map((r) => ({
    pool: r.isCoinholder ? "coinholder" : "zcg_grants",
    usdCents: BigInt(r.usdCents),
  }));
}
