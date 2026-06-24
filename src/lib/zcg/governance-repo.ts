import { asc, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgElections, zcgLinks, zcgMeetings } from "@/lib/db/schema";

/** Read layer for the admin-editable governance tables (meetings/elections/links). */

export type Meeting = typeof zcgMeetings.$inferSelect;

export type Election = Omit<typeof zcgElections.$inferSelect, "elected"> & {
  elected: string[] | null;
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
  }));
}

/** The active (not yet closed) election, if any. */
export function currentElection(elections: Election[]): Election | undefined {
  return elections.find((e) => e.status !== "closed");
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
