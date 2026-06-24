/**
 * ZCG committee elections — the ZCAP-voted committee that runs Zcash Community
 * Grants. Static for now (sourced from the Zcash forum / Zcash Foundation); a
 * later phase can scrape the governance-elections category on a schedule.
 */

export type Election = {
  id: string;
  title: string;
  /** "voting" = ZCAP poll open now; "closed" = finished. */
  status: "voting" | "closed";
  seats: number;
  url: string;
  nominationsClose?: string; // ISO yyyy-mm-dd
  communityCall?: string; // ISO yyyy-mm-dd
  votingCloses?: string; // ISO yyyy-mm-dd (20:00 UTC)
  resultsBy?: string; // ISO yyyy-mm-dd
  elected?: readonly string[];
  note?: string;
};

export const ZCG_ELECTIONS: readonly Election[] = [
  {
    id: "june-2026",
    title: "June 2026 Election",
    status: "voting",
    seats: 2,
    url: "https://forum.zcashcommunity.com/t/zcash-community-grants-zcg-nominations-now-open-for-june-election/55720",
    nominationsClose: "2026-06-08",
    communityCall: "2026-06-11",
    votingCloses: "2026-06-29",
    resultsBy: "2026-07-01",
    note: "Terms ending: decentralistdan and GGuy. ZCAP votes via a Special Initiative Vote after the June 11 community call.",
  },
  {
    id: "dec-2024",
    title: "December 2024 Election",
    status: "closed",
    seats: 3,
    url: "https://zfnd.org/results-of-the-zcg-election-dec-2024/",
    votingCloses: "2025-01-06",
    elected: ["Jason McGee", "Zerodartz", "Artkor"],
  },
  {
    id: "june-2024",
    title: "June 2024 Election",
    status: "closed",
    seats: 2,
    url: "https://forum.zcashcommunity.com/t/zcg-committee-election-june-2024/47770",
  },
];

/** The active (not yet closed) election, if any. */
export function currentElection(): Election | undefined {
  return ZCG_ELECTIONS.find((e) => e.status !== "closed");
}
