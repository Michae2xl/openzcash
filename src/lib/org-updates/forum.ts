import "server-only";

/**
 * Live updates published by an ecosystem organization on the community forum.
 *
 * The Foundation posts on a biweekly cadence (engineering updates, Zebra
 * releases, reports, announcements) and Shielded Labs posts irregularly. Both
 * publish to the forum first, so we read the Discourse JSON API and classify
 * each topic by its title. Nothing is hand-copied: a new post appears here on
 * the next refresh.
 */

const FORUM = "https://forum.zcashcommunity.com";
const TTL_MS = 30 * 60_000;

export type UpdateKind = "engineering" | "release" | "report" | "announcement";

export interface OrgUpdate {
  id: number;
  title: string;
  url: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  kind: UpdateKind;
  replies: number;
}

interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  posts_count?: number;
  reply_count?: number;
}

/** Discourse keeps emoji as :shortcodes: in titles; they render as raw text. */
function cleanTitle(title: string): string {
  return title
    .replace(/:[a-z0-9_+-]+:/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function classify(title: string): UpdateKind {
  const t = title.toLowerCase();
  if (t.includes("engineering update")) return "engineering";
  if (/\brelease\b|\bv?\d+\.\d+\.\d+/.test(t)) return "release";
  if (/\breport\b|year in review|quarterly/.test(t)) return "report";
  return "announcement";
}

const caches = new Map<string, { at: number; items: OrgUpdate[] }>();

async function search(query: string): Promise<DiscourseTopic[]> {
  try {
    const res = await fetch(
      `${FORUM}/search.json?q=${encodeURIComponent(query)}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const j = (await res.json()) as { topics?: DiscourseTopic[] };
    return j.topics ?? [];
  } catch {
    return [];
  }
}

async function category(id: number): Promise<DiscourseTopic[]> {
  try {
    const res = await fetch(`${FORUM}/c/${id}.json`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      topic_list?: { topics?: DiscourseTopic[] };
    };
    return j.topic_list?.topics ?? [];
  } catch {
    return [];
  }
}

function toUpdates(topics: DiscourseTopic[], limit: number): OrgUpdate[] {
  const byId = new Map<number, OrgUpdate>();
  for (const t of topics) {
    if (!t?.id || !t.title || !t.created_at) continue;
    byId.set(t.id, {
      id: t.id,
      title: cleanTitle(t.title),
      url: `${FORUM}/t/${t.slug ?? "topic"}/${t.id}`,
      date: t.created_at.slice(0, 10),
      kind: classify(t.title),
      replies: t.reply_count ?? Math.max((t.posts_count ?? 1) - 1, 0),
    });
  }
  return [...byId.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/**
 * Zcash Foundation updates: the Foundation forum category (engineering
 * updates, Zebra releases, reports, announcements), newest first.
 */
export async function getFoundationUpdates(limit = 24): Promise<OrgUpdate[]> {
  const key = `zf:${limit}`;
  const c = caches.get(key);
  if (c && Date.now() - c.at < TTL_MS) return c.items;

  const [cat, eng] = await Promise.all([
    category(21),
    search('"ZF Engineering Update" in:title order:latest_topic'),
  ]);
  const items = toUpdates([...cat, ...eng], limit).filter(
    // The category's pinned "About" topic is not an update.
    (u) => !/^about the/i.test(u.title),
  );
  if (items.length > 0) caches.set(key, { at: Date.now(), items });
  return items;
}

/** Shielded Labs posts, which go to Ecosystem Updates rather than a category
 * of their own, so we match on the organization's name in the title. */
export async function getShieldedLabsUpdates(limit = 12): Promise<OrgUpdate[]> {
  const key = `sl:${limit}`;
  const c = caches.get(key);
  if (c && Date.now() - c.at < TTL_MS) return c.items;

  const [byName, byTopic] = await Promise.all([
    search('"Shielded Labs" in:title order:latest_topic'),
    search("Crosslink OR Tachyon in:title order:latest_topic"),
  ]);
  const items = toUpdates(
    [
      ...byName,
      // Keep only the Crosslink/Tachyon threads that are theirs to avoid
      // sweeping in unrelated community discussion of the same words.
      ...byTopic.filter((t) => /shielded labs|crosslink/i.test(t.title)),
    ],
    limit,
  );
  if (items.length > 0) caches.set(key, { at: Date.now(), items });
  return items;
}
