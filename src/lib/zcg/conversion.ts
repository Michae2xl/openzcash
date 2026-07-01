import { titlesMatch } from "./match-titles";

/**
 * Proposal→grant conversion: link an *approved* proposal to the funded grant it
 * became, joining on title with the same fuzzy matcher used elsewhere
 * (titlesMatch). There is no shared id between the governance funnel and the
 * disbursement ledger, so this is probabilistic — the caller must surface the
 * unmatched proposals rather than pretend every approval converted.
 */

export interface ConvProposalIn {
  title: string;
  requestedUsdCents: bigint | null;
  decisionDate: string | null; // YYYY-MM-DD
}

export interface ConvGrantIn {
  grantKey: string;
  usdCents: bigint;
  firstPaid: string | null; // YYYY-MM-DD
  status: string | null;
}

export interface ConvPair {
  title: string;
  requestedUsdCents: bigint | null;
  decisionDate: string | null;
  /** null when no funded grant matched this approved proposal. */
  grantKey: string | null;
  disbursedUsdCents: bigint | null;
  firstPaid: string | null;
  /** Days from approval to first payment, when both dates exist. */
  lagDays: number | null;
}

export interface ConversionResult {
  pairs: ConvPair[];
  approvedCount: number;
  matchedCount: number;
}

const MS_PER_DAY = 86_400_000;

function dayDiff(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Join approved proposals to funded grants. Each grant is claimed at most once
 * (greedy, first title match wins) so two proposals can't both map to the same
 * grant.
 */
export function conversionAnalysis(
  proposals: ConvProposalIn[],
  grants: ConvGrantIn[],
): ConversionResult {
  const used = new Set<number>();
  const pairs: ConvPair[] = proposals.map((p) => {
    const idx = grants.findIndex(
      (g, i) => !used.has(i) && titlesMatch(p.title, g.grantKey),
    );
    if (idx < 0) {
      return {
        title: p.title,
        requestedUsdCents: p.requestedUsdCents,
        decisionDate: p.decisionDate,
        grantKey: null,
        disbursedUsdCents: null,
        firstPaid: null,
        lagDays: null,
      };
    }
    used.add(idx);
    const g = grants[idx];
    return {
      title: p.title,
      requestedUsdCents: p.requestedUsdCents,
      decisionDate: p.decisionDate,
      grantKey: g.grantKey,
      disbursedUsdCents: g.usdCents,
      firstPaid: g.firstPaid,
      lagDays: dayDiff(p.decisionDate, g.firstPaid),
    };
  });

  return {
    pairs,
    approvedCount: proposals.length,
    matchedCount: pairs.filter((p) => p.grantKey != null).length,
  };
}
