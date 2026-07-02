import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { zcgDisbursements, zcgProposals } from "@/lib/db/schema";
import { formatUsdCents } from "@/lib/zcg/format";
import { getZechubProposals } from "@/lib/dao/zechub";
import { getGrantApplications } from "@/lib/zcg/github-applications";

/**
 * Cross-source "what's new" feed: the Zcash forum (Discourse), GitHub releases
 * of the core repos, and the latest rows from the ZCG spreadsheet (already
 * mirrored in our DB by the daily cron). Fetched live on the server and cached
 * ~10 min in-process. No DB table — "unread" is computed per-visitor from the
 * item timestamps vs a localStorage "last seen" marker.
 */

export type NewsSource =
  "forum" | "github" | "sheet" | "proposal" | "dao" | "application";

export type NewsItem = {
  source: NewsSource;
  kind: string;
  title: string;
  url: string;
  ts: string; // ISO 8601 (normalized to milliseconds for stable ordering)
};

const TTL_MS = 10 * 60_000;
let cache: { at: number; items: NewsItem[] } | null = null;

const FORUM = "https://forum.zcashcommunity.com";
const GITHUB_REPOS = [
  "ZcashFoundation/zebra",
  "zingolabs/zaino",
  "zcash/zcash",
  "zcash/librustzcash",
  "zcash/wallet",
];
const FORUM_MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000; // surface topics from ~4 months

function iso(s: string): string {
  const t = Date.parse(s);
  return Number.isNaN(t) ? s : new Date(t).toISOString();
}

async function fetchForum(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${FORUM}/latest.json`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      topic_list?: {
        topics?: Array<{
          id: number;
          title: string;
          slug: string;
          created_at: string;
        }>;
      };
    };
    const cutoff = Date.now() - FORUM_MAX_AGE_MS;
    return (j.topic_list?.topics ?? [])
      .filter((t) => t.created_at && Date.parse(t.created_at) > cutoff)
      .map((t) => ({
        source: "forum" as const,
        kind: "Forum",
        title: t.title,
        url: `${FORUM}/t/${t.slug}/${t.id}`,
        ts: iso(t.created_at),
      }));
  } catch {
    return [];
  }
}

async function fetchRepo(repo: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=2`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "openzcash",
        },
        signal: AbortSignal.timeout(7_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const arr = (await res.json()) as Array<{
      name: string;
      tag_name: string;
      published_at: string;
      html_url: string;
    }>;
    if (!Array.isArray(arr)) return [];
    const name = repo.split("/")[1];
    return arr
      .filter((r) => r.published_at)
      .map((r) => ({
        source: "github" as const,
        kind: name,
        title: `${name} ${r.name || r.tag_name}`,
        url: r.html_url,
        ts: iso(r.published_at),
      }));
  } catch {
    return [];
  }
}

async function fetchSheet(): Promise<NewsItem[]> {
  try {
    const rows = await getDb()
      .select({
        recipient: zcgDisbursements.recipientNameRaw,
        usd: zcgDisbursements.amountUsdCents,
        paid: zcgDisbursements.paidOutDate,
        project: zcgDisbursements.project,
      })
      .from(zcgDisbursements)
      .where(eq(zcgDisbursements.isPaid, true))
      .orderBy(desc(zcgDisbursements.paidOutDate))
      .limit(12);
    return rows
      .filter((r) => r.paid)
      .map((r) => ({
        source: "sheet" as const,
        kind: "ZCG ledger",
        title: `${r.recipient ?? "Grant"} — ${formatUsdCents(r.usd ?? 0n)}`,
        url: r.project
          ? `/zcg/grant?g=${encodeURIComponent(r.project)}`
          : "/zcg/disbursements",
        ts: iso(`${r.paid}T00:00:00Z`),
      }));
  } catch {
    return [];
  }
}

async function fetchProposals(): Promise<NewsItem[]> {
  try {
    const rows = await getDb()
      .select({
        title: zcgProposals.title,
        program: zcgProposals.program,
        submitted: zcgProposals.submittedDate,
        forum: zcgProposals.forumLink,
        platform: zcgProposals.platformLink,
      })
      .from(zcgProposals)
      .orderBy(desc(zcgProposals.submittedDate))
      .limit(14);
    return rows
      .filter((r) => r.submitted)
      .map((r) => ({
        source: "proposal" as const,
        kind: r.program === "coinholder" ? "FPF proposal" : "ZCG proposal",
        title: r.title,
        url: r.forum || r.platform || "/zcg/proposals",
        ts: iso(`${r.submitted}T00:00:00Z`),
      }));
  } catch {
    return [];
  }
}

/** Newest ZecHub DAO proposals (DAO DAO on Juno), surfaced as news items. */
async function fetchDao(): Promise<NewsItem[]> {
  try {
    const proposals = await getZechubProposals(12);
    return proposals
      .filter((p) => p.createdAt)
      .map((p) => ({
        source: "dao" as const,
        kind: "ZecHub DAO",
        title: `${p.ref} · ${p.title}`,
        url: p.url,
        ts: iso(p.createdAt),
      }));
  } catch {
    return [];
  }
}

/** Newest ZCG grant applications (GitHub issues), surfaced first-hand. */
async function fetchApplications(): Promise<NewsItem[]> {
  try {
    const apps = await getGrantApplications(15);
    return apps.map((a) => ({
      source: "application" as const,
      kind:
        a.status === "review"
          ? "Grant application · ready for review"
          : "Grant application",
      title: a.title,
      url: a.url,
      ts: iso(a.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function getNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.items;
  const [forum, sheet, proposals, dao, apps, ...repos] = await Promise.all([
    fetchForum(),
    fetchSheet(),
    fetchProposals(),
    fetchDao(),
    fetchApplications(),
    ...GITHUB_REPOS.map(fetchRepo),
  ]);
  // Guard against future-dated source rows (e.g. a spreadsheet typo): one item
  // dated months ahead becomes `latest`, poisons every visitor's last-seen
  // marker, and the unread badge never fires again until that date passes.
  const maxTs = new Date(now + 48 * 3600 * 1000).toISOString();
  const items = [
    ...forum,
    ...sheet,
    ...proposals,
    ...dao,
    ...apps,
    ...repos.flat(),
  ]
    .filter((i) => i.ts && i.ts <= maxTs)
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 60);
  if (items.length === 0 && cache) return cache.items; // keep last good snapshot
  cache = { at: now, items };
  return items;
}

/** How far back the badge counts for a visitor with no last-seen marker. */
const FIRST_VISIT_WINDOW_MS = 48 * 3600 * 1000;

/**
 * Number of items newer than the visitor's last-seen ISO timestamp. First-time
 * visitors (no marker) get the recent window only — "today's news", not the
 * whole 60-item history as one scary 9+ badge.
 */
export function unreadCount(items: NewsItem[], since: string | null): number {
  const floor =
    since ?? new Date(Date.now() - FIRST_VISIT_WINDOW_MS).toISOString();
  return items.filter((i) => i.ts > floor).length;
}

/** Server wall-clock, kept out of component render bodies (purity lint). */
export function nowMs(): number {
  return Date.now();
}
