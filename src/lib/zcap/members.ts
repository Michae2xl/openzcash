import "server-only";
import { parseCsv } from "@/lib/zcg/csv";

/**
 * The public Zcash Community Advisory Panel (ZCAP / "ZAP") roster — the
 * volunteers who advise the Foundation and vote in ZCG elections. Read live
 * from the public Google Sheet and cached ~1h in-process. Returns the last good
 * snapshot (or empty) if the sheet is momentarily unreachable.
 */

export type ZcapMember = {
  name: string;
  handle: string;
  joined: string; // e.g. "May 2022"
  joinedSort: string; // "2022-05" for stable sorting
};

export const ZCAP_SHEET_ID = "1pg_zSzigrxjdF-1oLz9WDzscglL2_1vzK4jTRNcXiCQ";
export const ZCAP_SHEET_URL = `https://docs.google.com/spreadsheets/d/${ZCAP_SHEET_ID}/edit`;
const CSV_URL = `https://docs.google.com/spreadsheets/d/${ZCAP_SHEET_ID}/export?format=csv&gid=0`;

const TTL_MS = 60 * 60_000; // 1h
let cache: { at: number; members: ZcapMember[] } | null = null;

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

function joinedSort(joined: string): string {
  const m = joined.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return "0000-00";
  const mon = MONTHS[m[1].slice(0, 3).toLowerCase()] ?? 0;
  return `${m[2]}-${String(mon).padStart(2, "0")}`;
}

export async function getZcapMembers(): Promise<ZcapMember[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.members;
  try {
    const res = await fetch(CSV_URL, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (/^\s*<(!doctype|html)/i.test(text)) {
      throw new Error("received HTML (sheet not public?)");
    }
    const rows = parseCsv(text);
    const members: ZcapMember[] = [];
    for (let i = 1; i < rows.length; i++) {
      const name = (rows[i][0] ?? "").trim();
      if (!name) continue;
      const joined = (rows[i][2] ?? "").trim();
      members.push({
        name,
        handle: (rows[i][1] ?? "").trim(),
        joined,
        joinedSort: joinedSort(joined),
      });
    }
    if (members.length === 0 && cache) return cache.members;
    cache = { at: now, members };
    return members;
  } catch {
    return cache?.members ?? [];
  }
}
