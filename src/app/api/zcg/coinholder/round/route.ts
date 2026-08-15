import {
  COINHOLDER_ROUND,
  ROUND_BANDS,
  ROUND_PROPOSALS,
} from "@/lib/zcg/coinholder-round";

// Static curated dataset — safe to serve as a fully static route.
export const dynamic = "force-static";

/**
 * Public, read-only mirror of the open Coinholder-Directed Retroactive Grants
 * review round, as announced by FPF on the community forum. Amounts in USD
 * (dollars). The FPF announcement runs ahead of the public spreadsheet while
 * submissions are still being logged there.
 */
export async function GET() {
  return Response.json({
    program: "coinholder",
    round: {
      label: COINHOLDER_ROUND.label,
      announcedOn: COINHOLDER_ROUND.announcedOn,
      reviewCloses: COINHOLDER_ROUND.reviewCloses,
      pollOpens: COINHOLDER_ROUND.pollOpens,
      proposalCount: COINHOLDER_ROUND.proposalCount,
      totalRequestedUsd: COINHOLDER_ROUND.totalRequestedUsdCents / 100,
      sourceThreadUrl: COINHOLDER_ROUND.sourceThreadUrl,
      githubRepoUrl: COINHOLDER_ROUND.githubRepoUrl,
      dataDocUrl: COINHOLDER_ROUND.dataDocUrl,
      ballotOptions: COINHOLDER_ROUND.ballotOptions,
    },
    bands: ROUND_BANDS.map((b) => ({
      key: b.key,
      label: b.label,
      count: b.count,
      totalRequestedUsd: b.totalUsdCents / 100,
      sharePct: b.sharePct,
    })),
    proposals: ROUND_PROPOSALS.map((p) => ({
      rank: p.rank,
      project: p.project,
      org: p.org,
      requestedUsd: p.requestedUsdCents / 100,
      summary: p.summary,
      band: p.band,
      threadUrl: p.threadUrl,
      githubUrl: p.githubUrl,
    })),
    notes:
      "Curated from the FPF 30-day review announcement (see round.sourceThreadUrl). Amounts are requested, not approved or paid. For paid history use /api/zcg/data/*.",
  });
}
