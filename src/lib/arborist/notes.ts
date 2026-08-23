import "server-only";

/**
 * The Zcash Arborist Call archive.
 *
 * Notes for every call live as markdown in the community-maintained repo
 * ZcashCommunityGrants/arboretum-notes. We read the directory listing and the
 * raw files from GitHub (public, no auth), parse the header block of each note
 * — call number, date, duration, YouTube recording, moderator, notetaker and
 * agenda — and cache the result in-process. Nothing is hand-copied, so a new
 * call published upstream shows up here on the next refresh.
 */

const OWNER = "ZcashCommunityGrants";
const REPO = "arboretum-notes";
const DIR = "AllArboristCallNotes";
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${DIR}`;
const TTL_MS = 60 * 60_000; // notes change at most a couple of times a month

export const ARBORIST_REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const ARBORIST_FORUM_URL =
  "https://forum.zcashcommunity.com/c/ecosystem-updates/foundation/21";

/**
 * Scheduling announcements from the Zcash Foundation forum category.
 *
 * The notes repository only gets a file once a call has happened, so the
 * forum runs ahead of it: "no call this week", "next call on the 23rd",
 * holiday schedules. Those live here, above the archive. (Arborist news also
 * goes out on X, which has no free read API, so the forum is the source.)
 */
export interface ArboristAnnouncement {
  id: number;
  title: string;
  url: string;
  date: string;
}

let annCache: { at: number; items: ArboristAnnouncement[] } | null = null;

export async function getArboristAnnouncements(): Promise<
  ArboristAnnouncement[]
> {
  const now = Date.now();
  if (annCache && now - annCache.at < 30 * 60_000) return annCache.items;
  try {
    const res = await fetch(
      "https://forum.zcashcommunity.com/search.json?q=arborist%20in%3Atitle%20order%3Alatest_topic",
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return annCache?.items ?? [];
    const j = (await res.json()) as {
      topics?: Array<{ id: number; title: string; slug: string; created_at: string }>;
    };
    const items = (j.topics ?? [])
      .filter((t) => /arborist/i.test(t.title))
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        title: t.title,
        url: `https://forum.zcashcommunity.com/t/${t.slug}/${t.id}`,
        date: t.created_at.slice(0, 10),
      }));
    if (items.length > 0) annCache = { at: now, items };
    return items;
  } catch {
    return annCache?.items ?? [];
  }
}

export interface ArboristCall {
  /** Call number, e.g. 129. */
  number: number;
  /** ISO date (YYYY-MM-DD) when parseable. */
  date: string | null;
  /** Header line as written, kept when the date could not be parsed. */
  rawDate: string;
  /** Stated meeting duration, e.g. "15 minutes". */
  duration: string | null;
  /** YouTube recording URL — most calls have one. */
  video: string | null;
  /** YouTube video id, for the thumbnail. */
  videoId: string | null;
  moderator: string | null;
  notetaker: string | null;
  /** Agenda items listed in the header. */
  agenda: string[];
  /** Link to the note file on GitHub. */
  url: string;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function cleanName(v: string | undefined): string | null {
  if (!v) return null;
  const s = v
    .replace(/\(.*?\)/g, "")
    .replace(/[@#].*$/, "")
    .replace(/[-–—:,.]+$/, "")
    .trim();
  return s.length > 0 && s.length < 60 ? s : null;
}

/** Parses the header block of one note. Format drifted over the years, so
 * both "6th Aug, 2026" and "February 6th, 2026" (and a missing year) occur. */
export function parseNote(
  md: string,
  fallbackNumber: number | null,
  fileName: string,
): ArboristCall | null {
  if (md.length < 200) return null;

  const numMatch = md.match(/Arborist\s+[Cc]all\s+(\d+)/);
  const number = numMatch
    ? Number(numMatch[1])
    : (fallbackNumber ?? Number(fileName.match(/(\d+)/)?.[1] ?? NaN));
  if (!Number.isFinite(number)) return null;

  const rawDate =
    md.match(/Meeting Date\/?\s*Time\s*:?\s*([^\n]+)/i)?.[1]?.trim() ?? "";

  let date: string | null = null;
  // "6th Aug, 2026" | "22nd Jan.2026" | "February 6th, 2026"
  const dmy = rawDate.match(
    /(\d{1,2})\s*(?:st|nd|rd|th)?\s*[.,]?\s*([A-Za-z]{3,})\.?\s*[.,]?\s*(\d{4})?/,
  );
  const mdy = rawDate.match(
    /([A-Za-z]{3,})\.?\s+(\d{1,2})\s*(?:st|nd|rd|th)?\s*[.,]?\s*(\d{4})?/,
  );
  const pick = (day: string, mon: string, year?: string) => {
    const mi = MONTHS[mon.toLowerCase().slice(0, 3)];
    if (!mi || !year) return null;
    return `${year}-${String(mi).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
  };
  if (dmy && MONTHS[dmy[2]!.toLowerCase().slice(0, 3)]) {
    date = pick(dmy[1]!, dmy[2]!, dmy[3]);
  } else if (mdy) {
    date = pick(mdy[2]!, mdy[1]!, mdy[3]);
  }

  const video =
    md.match(
      /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/,
    )?.[1] ?? null;
  const videoId = video?.match(/(?:v=|youtu\.be\/)([\w-]{6,})/)?.[1] ?? null;

  // Agenda: the lines between "Agenda:" and the video/moderator block.
  const agendaBlock = md.match(
    /Agenda\s*:?\s*\n([\s\S]*?)(?:\n\s*(?:Video of the meeting|Moderator|## Full Notes))/i,
  )?.[1];
  const agenda = (agendaBlock ?? "")
    .split("\n")
    .map((l) =>
      l
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links -> text
        .replace(/^[-*\d.\s]+/, "")
        .trim(),
    )
    .filter((l) => l.length > 2 && l.length < 120)
    .slice(0, 8);

  return {
    number,
    date,
    rawDate,
    duration:
      md.match(/Meeting Duration\s*:?\s*([^\n]+)/i)?.[1]?.trim() ?? null,
    video,
    videoId,
    moderator: cleanName(md.match(/Moderator\s*:?\s*([^\n]+)/i)?.[1]),
    notetaker: cleanName(md.match(/^Notes\s*:?\s*([^\n]+)/im)?.[1]),
    agenda,
    url: `https://github.com/${OWNER}/${REPO}/blob/main/${DIR}/${encodeURIComponent(fileName)}`,
  };
}

/** Fills in years the header omitted, using the surrounding calls. */
function inferMissingDates(calls: ArboristCall[]): ArboristCall[] {
  const sorted = [...calls].sort((a, b) => a.number - b.number);
  return sorted.map((c, i) => {
    if (c.date || !c.rawDate) return c;
    const mon = c.rawDate.match(/([A-Za-z]{3,})/)?.[1];
    const day = c.rawDate.match(/(\d{1,2})\s*(?:st|nd|rd|th)/)?.[1];
    const mi = mon ? MONTHS[mon.toLowerCase().slice(0, 3)] : undefined;
    if (!mi || !day) return c;
    // Nearest neighbour with a known year, walking outwards.
    for (let d = 1; d < sorted.length; d++) {
      const near = sorted[i - d]?.date ?? sorted[i + d]?.date;
      if (near) {
        const year = Number(near.slice(0, 4));
        return {
          ...c,
          date: `${year}-${String(mi).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`,
        };
      }
    }
    return c;
  });
}

let cache: { at: number; items: ArboristCall[] } | null = null;

/** Every Arborist call, newest first. Cached ~1h in-process. */
export async function getArboristCalls(): Promise<ArboristCall[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.items;

  try {
    const listRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DIR}`,
      {
        headers: {
          accept: "application/vnd.github+json",
          ...(process.env.GITHUB_TOKEN
            ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );
    if (!listRes.ok) return cache?.items ?? [];
    const listing = (await listRes.json()) as { name: string; type: string }[];
    const files = listing
      .filter((f) => f.type === "file" && /\.md$/i.test(f.name))
      .filter((f) => /call/i.test(f.name));

    const items: ArboristCall[] = [];
    const CHUNK = 12;
    for (let i = 0; i < files.length; i += CHUNK) {
      const batch = await Promise.all(
        files.slice(i, i + CHUNK).map(async (f) => {
          try {
            const r = await fetch(`${RAW}/${encodeURIComponent(f.name)}`, {
              signal: AbortSignal.timeout(8_000),
              cache: "no-store",
            });
            if (!r.ok) return null;
            return parseNote(await r.text(), null, f.name);
          } catch {
            return null;
          }
        }),
      );
      items.push(...batch.filter((x): x is ArboristCall => x !== null));
    }
    if (items.length === 0) return cache?.items ?? [];

    // De-duplicate by call number (the repo keeps a stray copy or two).
    const byNumber = new Map<number, ArboristCall>();
    for (const c of items) {
      const prev = byNumber.get(c.number);
      if (!prev || (!prev.date && c.date)) byNumber.set(c.number, c);
    }
    const result = inferMissingDates([...byNumber.values()]).sort(
      (a, b) => b.number - a.number,
    );
    cache = { at: now, items: result };
    return result;
  } catch {
    return cache?.items ?? [];
  }
}
