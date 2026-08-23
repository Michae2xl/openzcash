import "server-only";
import type { Community } from "./data";

/**
 * Live forum activity for the tracked community topics.
 *
 * Reads each topic's metadata from the public Discourse JSON API
 * (forum.zcashcommunity.com) and caches ~10 min in-process — the same
 * pattern as the other live feeds (zechub proposals, live-price). The X
 * profiles in the dataset are links only: X has no free read API, so the
 * activity signal here is the forum, where communities post their monthly
 * reports.
 */

const FORUM = "https://forum.zcashcommunity.com";
const TTL_MS = 10 * 60_000;

export interface TopicActivity {
  topicId: number;
  communityId: string;
  title: string;
  url: string;
  kind: string;
  /** ISO timestamp of the newest post in the topic. */
  lastPostedAt: string;
  postsCount: number;
}

interface DiscourseTopic {
  id?: number;
  title?: string;
  slug?: string;
  last_posted_at?: string;
  posts_count?: number;
}

let cache: { at: number; items: TopicActivity[] } | null = null;

async function fetchTopic(id: number): Promise<DiscourseTopic | null> {
  try {
    const res = await fetch(`${FORUM}/t/${id}.json`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DiscourseTopic;
  } catch {
    return null;
  }
}

/**
 * Latest activity for every tracked topic across all communities, newest
 * first. Missing/failed topics are simply omitted (the page renders what it
 * has — the forum being briefly down should not blank the directory).
 */
export async function getCommunityActivity(
  communities: Community[],
): Promise<TopicActivity[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.items;

  const wanted = communities.flatMap((c) =>
    c.forumTopics.map((t) => ({ community: c, topic: t })),
  );
  // Discourse rate-limits anonymous bursts, so fetch in staggered chunks and
  // give failures one retry pass instead of firing all ~54 requests at once.
  const one = async ({
    community,
    topic,
  }: (typeof wanted)[number]): Promise<TopicActivity | null> => {
    const d = (await fetchTopic(topic.id)) ?? (await fetchTopic(topic.id));
    if (!d?.last_posted_at) return null;
    return {
      topicId: topic.id,
      communityId: community.id,
      title: d.title ?? topic.title,
      url: `${FORUM}/t/${d.slug ?? "topic"}/${topic.id}`,
      kind: topic.kind,
      lastPostedAt: d.last_posted_at,
      postsCount: d.posts_count ?? 0,
    };
  };
  const results: (TopicActivity | null)[] = [];
  const CHUNK = 12;
  for (let i = 0; i < wanted.length; i += CHUNK) {
    results.push(...(await Promise.all(wanted.slice(i, i + CHUNK).map(one))));
    if (i + CHUNK < wanted.length)
      await new Promise((r) => setTimeout(r, 1_200));
  }
  const items = results
    .filter((x): x is TopicActivity => x !== null)
    .sort((a, b) => b.lastPostedAt.localeCompare(a.lastPostedAt));
  if (items.length > 0) cache = { at: now, items };
  return items;
}
