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

/**
 * Paid USD in the external-grant ledger for the ZCG pool — grant milestones plus
 * contractor payments only. This is the like-for-like counterpart of the
 * published "grants to the ecosystem" total. The internal buckets (discretionary
 * budget, monthly stipends) are deliberately excluded: the published pivot
 * counts them at a broader cumulative scope than their source tabs, so folding
 * them in makes the cross-check diverge for a non-issue rather than catching a
 * real one — those two are reconciled on their own pages.
 */
export async function ledgerGrantsPaidCents(): Promise<bigint> {
  const [r] = await getDb()
    .select({
      usdCents: sql<string>`coalesce(sum(${zcgDisbursements.amountUsdCents}) filter (where ${zcgDisbursements.isPaid} and ${zcgDisbursements.sourceSheet} in ('grants_disbursed','ic_payments')),0)`,
    })
    .from(zcgDisbursements);

  return BigInt(r?.usdCents ?? "0");
}
