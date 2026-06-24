/**
 * One-time (idempotent) seed of the editable governance tables — migrates the
 * formerly-hardcoded ZCG meetings / elections / config links into Postgres.
 * Safe to re-run: upserts by primary key.
 *
 *   npx tsx scripts/seed-zcg-governance.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const MEETINGS = [
  [
    "2026-06-08",
    "June 8, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-6-8-2026/56139",
  ],
  [
    "2026-05-25",
    "May 25, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-05-25-2026/55883",
  ],
  [
    "2026-04-27",
    "April 27, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-april-27-2026/55555",
  ],
  [
    "2026-04-13",
    "April 13, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-4-13-2026/55349",
  ],
  [
    "2026-03-30",
    "March 30, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-3-30-2026/55196",
  ],
  [
    "2026-02-03",
    "February 3, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-2-3-2026/54548",
  ],
  [
    "2026-01-19",
    "January 19, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-1-19-2026/54383",
  ],
  [
    "2026-01-05",
    "January 5, 2026",
    "https://forum.zcashcommunity.com/t/zcash-community-grants-meeting-minutes-1-5-2026/54163",
  ],
] as const;

const ELECTIONS = [
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
    elected: null as string[] | null,
    note: "Terms ending: decentralistdan and GGuy. ZCAP votes via a Special Initiative Vote after the June 11 community call.",
    sortOrder: 0,
  },
  {
    id: "dec-2024",
    title: "December 2024 Election",
    status: "closed",
    seats: 3,
    url: "https://zfnd.org/results-of-the-zcg-election-dec-2024/",
    nominationsClose: null,
    communityCall: null,
    votingCloses: "2025-01-06",
    resultsBy: null,
    elected: ["Jason McGee", "Zerodartz", "Artkor"] as string[] | null,
    note: null,
    sortOrder: 1,
  },
  {
    id: "june-2024",
    title: "June 2024 Election",
    status: "closed",
    seats: 2,
    url: "https://forum.zcashcommunity.com/t/zcg-committee-election-june-2024/47770",
    nominationsClose: null,
    communityCall: null,
    votingCloses: null,
    resultsBy: null,
    elected: null as string[] | null,
    note: null,
    sortOrder: 2,
  },
];

const LINKS = [
  [
    "proposal_zcg",
    "Submit a ZCG proposal",
    "https://github.com/ZcashCommunityGrants/zcashcommunitygrants/issues",
  ],
  [
    "proposal_fpf",
    "Submit an FPF proposal",
    "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues",
  ],
  [
    "forum_category",
    "ZCG forum category",
    "https://forum.zcashcommunity.com/c/grants/zomg-updates/34",
  ],
  [
    "cryptpad_milestone",
    "FPF milestone form",
    "https://cryptpad.fr/form/#/2/form/view/qmTMynvJfBAdbpoCWHddUCT8LxdSbmsWXXLTwVBvY+Dc/",
  ],
] as const;

async function main() {
  const { getDb } = await import("../src/lib/db/client");
  const { zcgElections, zcgLinks, zcgMeetings } =
    await import("../src/lib/db/schema");
  const db = getDb();

  for (const [date, title, url] of MEETINGS) {
    await db
      .insert(zcgMeetings)
      .values({ id: `mtg-${date}`, title, meetingDate: date, url })
      .onConflictDoUpdate({
        target: zcgMeetings.id,
        set: { title, meetingDate: date, url },
      });
  }

  for (const e of ELECTIONS) {
    await db
      .insert(zcgElections)
      .values(e)
      .onConflictDoUpdate({ target: zcgElections.id, set: e });
  }

  for (const [key, label, url] of LINKS) {
    await db
      .insert(zcgLinks)
      .values({ key, label, url })
      .onConflictDoUpdate({ target: zcgLinks.key, set: { label, url } });
  }

  console.log(
    `seeded: ${MEETINGS.length} meetings, ${ELECTIONS.length} elections, ${LINKS.length} links`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
