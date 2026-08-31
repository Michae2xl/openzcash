import { asc, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgElections, zcgLinks, zcgMeetings } from "@/lib/db/schema";

/** Read layer for the admin-editable governance tables (meetings/elections/links). */

export type Meeting = typeof zcgMeetings.$inferSelect;

export type Election = Omit<typeof zcgElections.$inferSelect, "elected"> & {
  elected: string[] | null;
};

/**
 * Stable historical correction for an election that remained marked "voting"
 * in the admin table after its result was published. Keeping this at the read
 * boundary makes stale databases render the verified result immediately; the
 * seed files carry the same correction for fresh environments.
 * Source: https://zfnd.org/zcg-election-results-june-2026/
 */
const VERIFIED_ELECTION_CORRECTIONS: Record<string, Partial<Election>> = {
  "june-2026": {
    status: "closed",
    url: "https://zfnd.org/zcg-election-results-june-2026/",
    resultsBy: "2026-06-29",
    elected: ["GGuy", "Paul Brigner"],
    note: "GGuy and Paul Brigner were elected and joined the committee on July 1, 2026.",
  },
};

export async function getMeetings(): Promise<Meeting[]> {
  return getDb()
    .select()
    .from(zcgMeetings)
    .orderBy(desc(zcgMeetings.meetingDate));
}

export async function getElections(): Promise<Election[]> {
  const rows = await getDb()
    .select()
    .from(zcgElections)
    .orderBy(asc(zcgElections.sortOrder));
  return rows.map((r) => ({
    ...r,
    elected: (r.elected as string[] | null) ?? null,
    ...VERIFIED_ELECTION_CORRECTIONS[r.id],
  }));
}

/** Defensive lifecycle check: an expired vote must never render as live. */
export function isElectionClosed(
  election: Election,
  nowMs = Date.now(),
): boolean {
  if (election.status === "closed") return true;
  if (!election.votingCloses) return false;
  return new Date(`${election.votingCloses}T20:00:00Z`).getTime() < nowMs;
}

/** The active (not yet closed or expired) election, if any. */
export function currentElection(elections: Election[]): Election | undefined {
  return elections.find((e) => !isElectionClosed(e));
}

export type LinkRow = typeof zcgLinks.$inferSelect;

/** All config links as a key -> url map (for rendering). */
export async function getLinks(): Promise<Record<string, string>> {
  const rows = await getDb().select().from(zcgLinks);
  return Object.fromEntries(rows.map((r) => [r.key, r.url]));
}

/** Full link rows ordered by key (for the admin editor). */
export async function getLinkRows(): Promise<LinkRow[]> {
  return getDb().select().from(zcgLinks).orderBy(asc(zcgLinks.key));
}
