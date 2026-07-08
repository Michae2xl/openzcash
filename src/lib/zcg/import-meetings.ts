import "server-only";
import { getDb } from "@/lib/db/client";
import { zcgMeetings, zcgSheetImports } from "@/lib/db/schema";
import { sha256 } from "./sheets";

/**
 * Auto-imports the recurring "Zcash Community Grants Meeting Minutes" threads
 * from the community forum into zcg_meetings, as part of the daily refresh.
 *
 * Dedupes by forum thread id, so it NEVER duplicates or overwrites
 * admin-entered meetings — it only inserts threads not already present. The
 * forum (Discourse) search returns the ~50 most recent matching threads, which
 * keeps the structured meetings list current without touching governance rows
 * a human curated.
 */

const FORUM = "https://forum.zcashcommunity.com";
// order:latest matters: without it Discourse ranks by phrase relevance and the
// 50-result window fills with OLD minutes, silently dropping the newest thread
// whenever its title drifts (e.g. "Zcash Community Grants (ZCG) Meeting
// Minutes 7/6/2026" ranked below 50 and never imported).
const SEARCH = `${FORUM}/search.json?q=${encodeURIComponent(
  "Zcash Community Grants Meeting Minutes #grants order:latest",
)}`;

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

interface Topic {
  id: number;
  title: string;
  slug: string;
  created_at: string;
}

export interface MeetingImportResult {
  gid: string;
  rows: number;
  imported: number;
  status: string;
}

/** Best-effort meeting date from the thread title; falls back to the post date. */
function meetingDate(title: string, createdAt: string): string | null {
  const slash = title.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slash) {
    const m = Number(slash[1]);
    const d = Number(slash[2]);
    let y = Number(slash[3]);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2100)
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const named = title.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i,
  );
  if (named) {
    const m = MONTHS[named[1].toLowerCase()];
    const d = Number(named[2]);
    const y = Number(named[3]);
    if (m && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const t = Date.parse(createdAt);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/** Trailing numeric thread id of a forum URL, e.g. .../slug/56384 → "56384". */
function threadIdFromUrl(url: string): string | null {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? m[1] : null;
}

export async function importMeetings(): Promise<MeetingImportResult[]> {
  const db = getDb();
  try {
    const res = await fetch(SEARCH, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`forum search HTTP ${res.status}`);
    const json = (await res.json()) as { topics?: Topic[] };
    const topics = (json.topics ?? []).filter((t) =>
      /meeting\s+minutes/i.test(t.title || ""),
    );

    const existing = await db
      .select({ url: zcgMeetings.url })
      .from(zcgMeetings);
    const have = new Set(
      existing
        .map((r) => threadIdFromUrl(r.url))
        .filter((x): x is string => Boolean(x)),
    );

    const toInsert: {
      id: string;
      title: string;
      meetingDate: string;
      url: string;
    }[] = [];
    for (const t of topics) {
      const tid = String(t.id);
      if (have.has(tid)) continue;
      const date = meetingDate(t.title, t.created_at);
      if (!date) continue;
      have.add(tid);
      toInsert.push({
        id: `forum:${tid}`,
        title: t.title,
        meetingDate: date,
        url: `${FORUM}/t/${t.slug}/${t.id}`,
      });
    }

    if (toInsert.length)
      await db.insert(zcgMeetings).values(toInsert).onConflictDoNothing();

    await db
      .insert(zcgSheetImports)
      .values({
        id: `meetings:${sha256(topics.map((t) => t.id).join(",")).slice(0, 16)}`,
        sheetGid: "meetings",
        sheetGroup: "governance",
        contentSha256: sha256(topics.map((t) => t.id).join(",")),
        rowCount: topics.length,
        sheetStatus: "ok",
        parsedOk: true,
      })
      .onConflictDoNothing();

    return [
      {
        gid: "meetings",
        rows: topics.length,
        imported: toInsert.length,
        status: "ok",
      },
    ];
  } catch (err) {
    console.error(
      `importMeetings failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [
      {
        gid: "meetings",
        rows: 0,
        imported: 0,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      },
    ];
  }
}
