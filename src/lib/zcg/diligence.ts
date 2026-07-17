import "server-only";
import { ghHeaders } from "./github-headers";
import { officeUnderReview } from "./proposals-repo";

/**
 * Public-data diligence signals for proposals under review — the feature
 * announced on the forum. Computed ONLY for the live under-review set (small
 * sample by design) and ONLY from public data (GitHub API + the Zcash forum's
 * public profile endpoint): no keys, no scraping, no deanonymization;
 * pseudonymous applicants with a public track record score exactly like named
 * ones. Signals inform, reviewers decide.
 *
 * All network work happens in `warmDiligence()`, called from the in-process
 * cron (boot + daily) — page renders only read the in-memory cache and never
 * wait on GitHub. Unauthenticated rate limits respected: core API ~2 calls per
 * unique applicant per warm; the issue-title search API (10 req/min) is paced
 * at one request every 6.5s and results are cached for 24h.
 */

const GH = "https://api.github.com";
const ZCG_REPO = "ZcashCommunityGrants/zcashcommunitygrants";

const SIGNAL_TTL_MS = 6 * 60 * 60 * 1000; // applicant profile + prior apps
const DUP_TTL_MS = 24 * 60 * 60 * 1000; // cross-ecosystem title search
const SEARCH_SPACING_MS = 6_500;

export type DiligenceSignals = {
  applicant: string;
  /** Whole years since the GitHub account was created (0 = under a year). */
  accountAgeYears: number | null;
  publicRepos: number | null;
  /** Zcash forum account with the same handle (best-effort match): age in
   * whole years and lifetime post count. Null when no such forum user. */
  forumAgeYears: number | null;
  forumPosts: number | null;
  /** Grant applications this login filed in the ZCG repo before the current
   * under-review ones, split by outcome label. */
  priorApps: number | null;
  priorApproved: number | null;
  priorDeclined: number | null;
  /** Issues elsewhere on GitHub whose title matches this proposal's. */
  dupCount: number | null;
  dupUrl: string | null;
  /** Application thread on the community forum (required by the ZCG T&C).
   * Null url + missing=true means the search ran and found none. */
  forumTopicUrl: string | null;
  forumTopicMissing: boolean;
  /** First ZCG meeting-minutes post that mentions this proposal's title. */
  meetingUrl: string | null;
};

type ApplicantFacts = {
  accountAgeYears: number | null;
  publicRepos: number | null;
  forumAgeYears: number | null;
  forumPosts: number | null;
  priorApps: number | null;
  priorApproved: number | null;
  priorDeclined: number | null;
  at: number;
};
type DupFacts = { dupCount: number | null; dupUrl: string | null; at: number };
type ForumFacts = {
  topicUrl: string | null;
  missing: boolean;
  meetingUrl: string | null;
  at: number;
};

/**
 * Cache store anchored on globalThis: Next bundles routes/pages as separate
 * module graphs, so plain module-level state would give the cron's route one
 * cache instance and the proposals page another (always empty). The
 * globalThis singleton is shared per Node process, like the DB client.
 */
type DiligenceStore = {
  applicantCache: Map<string, ApplicantFacts>;
  dupCache: Map<number, DupFacts>;
  forumCache: Map<number, ForumFacts>;
  applicantByIssue: Map<number, string>;
  warming: boolean;
};
const g = globalThis as unknown as { __zcgDiligence?: DiligenceStore };
const store: DiligenceStore = (g.__zcgDiligence ??= {
  applicantCache: new Map(),
  dupCache: new Map(),
  forumCache: new Map(),
  applicantByIssue: new Map(),
  warming: false,
});
// Dev HMR keeps an older store instance alive across module reloads; make
// sure fields added after that instance was created exist.
store.forumCache ??= new Map();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ghJson<T>(url: string): Promise<T | null> {
  try {
    // The GitHub token must never be sent to non-GitHub hosts (forum calls
    // also flow through this helper).
    const headers = url.startsWith(GH)
      ? ghHeaders()
      : { accept: "application/json", "user-agent": "openzcash" };
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(9_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchApplicantFacts(
  login: string,
  currentNumbers: Set<number>,
): Promise<ApplicantFacts> {
  const [user, issues, forum, forumSummary] = await Promise.all([
    ghJson<{ created_at?: string; public_repos?: number }>(
      `${GH}/users/${encodeURIComponent(login)}`,
    ),
    ghJson<
      Array<{
        number: number;
        title?: string;
        pull_request?: unknown;
        labels?: Array<{ name: string }>;
      }>
    >(
      `${GH}/repos/${ZCG_REPO}/issues?creator=${encodeURIComponent(login)}&state=all&per_page=100`,
    ),
    // Zcash forum profile under the SAME handle — a best-effort match, but for
    // this community it beats GitHub age as an involvement signal. 404 (handle
    // not on the forum) simply yields nulls. created_at lives on the profile,
    // post_count only on the summary endpoint, hence two requests.
    ghJson<{
      user?: { created_at?: string };
    }>(`https://forum.zcashcommunity.com/u/${encodeURIComponent(login)}.json`),
    ghJson<{
      user_summary?: { post_count?: number };
    }>(
      `https://forum.zcashcommunity.com/u/${encodeURIComponent(login)}/summary.json`,
    ),
  ]);

  const ageYears = (createdAt: string | undefined): number | null => {
    if (!createdAt) return null;
    const t = Date.parse(createdAt);
    if (Number.isNaN(t)) return null;
    return Math.floor((Date.now() - t) / (365.25 * 86_400_000));
  };
  const accountAgeYears = ageYears(user?.created_at);
  const forumAgeYears = ageYears(forum?.user?.created_at);

  let priorApps: number | null = null;
  let priorApproved: number | null = null;
  let priorDeclined: number | null = null;
  if (Array.isArray(issues)) {
    const apps = issues.filter(
      (i) =>
        !i.pull_request &&
        !currentNumbers.has(i.number) &&
        ((i.labels ?? []).some((l) => l.name.includes("Grant Application")) ||
          /^\s*(zcg\s+)?grant\s+application\b/i.test(i.title ?? "")),
    );
    priorApps = apps.length;
    priorApproved = apps.filter((i) =>
      (i.labels ?? []).some((l) => l.name.includes("Approved")),
    ).length;
    priorDeclined = apps.filter((i) =>
      (i.labels ?? []).some(
        (l) => l.name.includes("Declined") || l.name.includes("Rejected"),
      ),
    ).length;
  }

  return {
    accountAgeYears,
    publicRepos: user?.public_repos ?? null,
    forumAgeYears,
    forumPosts: forumSummary?.user_summary?.post_count ?? null,
    priorApps,
    priorApproved,
    priorDeclined,
    at: Date.now(),
  };
}

/** Strip the boilerplate prefix so the search matches the substantive title. */
function searchableTitle(title: string): string | null {
  const t = title
    .replace(/^\s*(zcg\s+)?(grant\s+)?application\s*[-—:–]?\s*/i, "")
    .trim();
  // Too-short titles ("Zcash Wallet") would only produce noise.
  return t.length >= 16 ? t : null;
}

async function fetchDupFacts(number: number, title: string): Promise<DupFacts> {
  const t = searchableTitle(title);
  if (!t) return { dupCount: null, dupUrl: null, at: Date.now() };
  const q = `"${t}" in:title -repo:${ZCG_REPO}`;
  const res = await ghJson<{ total_count?: number }>(
    `${GH}/search/issues?q=${encodeURIComponent(q)}&per_page=1`,
  );
  if (res == null) return { dupCount: null, dupUrl: null, at: Date.now() };
  const count = res.total_count ?? 0;
  // A proposal genuinely re-filed with other ecosystems matches a handful of
  // issues; hundreds means the title is a generic phrase ("Offensive
  // Security" → 1300+ unrelated hits) and the signal is unusable, not a flag.
  if (count > 25) return { dupCount: null, dupUrl: null, at: Date.now() };
  return {
    dupCount: count,
    dupUrl:
      count > 0
        ? `https://github.com/search?q=${encodeURIComponent(q)}&type=issues`
        : null,
    at: Date.now(),
  };
}

const FORUM = "https://forum.zcashcommunity.com";

/** Lowercase, punctuation-free, whitespace-collapsed form for fuzzy compare. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * One forum search per proposal answers two questions: does the application
 * thread required by the ZCG T&C exist, and has a meeting-minutes post
 * mentioned this title? Thread matching is fuzzy (title word overlap), so a
 * "missing" verdict is a signal to verify, not a proven violation.
 */
async function fetchForumFacts(
  title: string,
  submittedAt: string,
): Promise<ForumFacts> {
  const t = searchableTitle(title) ?? title.trim();
  const res = await ghJson<{
    topics?: Array<{
      id: number;
      slug: string;
      title: string;
      created_at?: string;
    }>;
    posts?: Array<{ topic_id: number; post_number: number }>;
  }>(`${FORUM}/search.json?q=${encodeURIComponent(t)}`);
  if (res == null)
    return { topicUrl: null, missing: false, meetingUrl: null, at: Date.now() };

  const topics = res.topics ?? [];
  const byId = new Map(topics.map((x) => [x.id, x]));
  const nTitle = norm(t);
  const words = nTitle.split(" ").filter((w) => w.length > 2);

  const isMatch = (topicTitle: string) => {
    const nt = norm(topicTitle);
    if (nt.includes(nTitle)) return true;
    if (!words.length) return false;
    const hit = words.filter((w) => nt.includes(w)).length;
    return hit / words.length >= 0.8;
  };

  const appTopic = topics.find(
    (x) => !/meeting\s+minutes/i.test(x.title) && isMatch(x.title),
  );

  // A proposal can only appear in minutes AFTER it was submitted — older
  // matches are similarly-titled proposals from past cycles (the Zenith trap).
  let meetingUrl: string | null = null;
  for (const p of res.posts ?? []) {
    const topic = byId.get(p.topic_id);
    if (!topic || !/meeting\s+minutes/i.test(topic.title)) continue;
    const topicDay = (topic.created_at ?? "").slice(0, 10);
    if (submittedAt && topicDay && topicDay < submittedAt) continue;
    meetingUrl = `${FORUM}/t/${topic.slug}/${topic.id}/${p.post_number}`;
    break;
  }

  return {
    topicUrl: appTopic ? `${FORUM}/t/${appTopic.slug}/${appTopic.id}` : null,
    missing: !appTopic,
    meetingUrl,
    at: Date.now(),
  };
}

/**
 * Computes/refreshes the signals for everything currently under review.
 * Long-running by design (search API pacing) — call it fire-and-forget from
 * the cron, never from a request path.
 */
export async function warmDiligence(): Promise<{
  ok: boolean;
  proposals: number;
}> {
  if (store.warming) return { ok: true, proposals: 0 };
  store.warming = true;
  try {
    const proposals = await officeUnderReview(100);
    const now = Date.now();
    const currentNumbers = new Set(proposals.map((p) => p.number));

    for (const p of proposals)
      store.applicantByIssue.set(p.number, p.applicant);

    const logins = [...new Set(proposals.map((p) => p.applicant))].filter(
      (l) => l && !/[^a-zA-Z0-9-]/.test(l),
    );
    for (const login of logins) {
      const hit = store.applicantCache.get(login);
      if (hit && now - hit.at < SIGNAL_TTL_MS) continue;
      store.applicantCache.set(
        login,
        await fetchApplicantFacts(login, currentNumbers),
      );
    }

    for (const p of proposals) {
      const dupHit = store.dupCache.get(p.number);
      const forumHit = store.forumCache.get(p.number);
      const dupStale = !dupHit || now - dupHit.at >= DUP_TTL_MS;
      const forumStale = !forumHit || now - forumHit.at >= DUP_TTL_MS;
      if (forumStale) {
        store.forumCache.set(
          p.number,
          await fetchForumFacts(p.title, p.createdAt),
        );
      }
      if (dupStale) {
        store.dupCache.set(p.number, await fetchDupFacts(p.number, p.title));
        await sleep(SEARCH_SPACING_MS); // GitHub search: 10 req/min unauthenticated
      } else if (forumStale) {
        await sleep(1_000); // forum search is lenient; still be polite
      }
    }

    return { ok: true, proposals: proposals.length };
  } catch {
    return { ok: false, proposals: 0 };
  } finally {
    store.warming = false;
  }
}

/** Cache-only read for page renders: never touches the network. */
export function getDiligence(): Map<number, DiligenceSignals> {
  const out = new Map<number, DiligenceSignals>();
  for (const [number, applicant] of store.applicantByIssue) {
    const a = store.applicantCache.get(applicant);
    const d = store.dupCache.get(number);
    const f = store.forumCache.get(number);
    if (!a && !d && !f) continue;
    out.set(number, {
      applicant,
      accountAgeYears: a?.accountAgeYears ?? null,
      publicRepos: a?.publicRepos ?? null,
      forumAgeYears: a?.forumAgeYears ?? null,
      forumPosts: a?.forumPosts ?? null,
      priorApps: a?.priorApps ?? null,
      priorApproved: a?.priorApproved ?? null,
      priorDeclined: a?.priorDeclined ?? null,
      dupCount: d?.dupCount ?? null,
      dupUrl: d?.dupUrl ?? null,
      forumTopicUrl: f?.topicUrl ?? null,
      forumTopicMissing: f?.missing ?? false,
      meetingUrl: f?.meetingUrl ?? null,
    });
  }
  return out;
}
