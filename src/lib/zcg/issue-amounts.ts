import "server-only";
import { listProposals } from "./proposals-repo";
import { getGrantApplications } from "./github-applications";
import { requestedAmountFromBody } from "./github-applications-parse";
import { issueNumberFromLink } from "./issue-link";

/**
 * Requested amounts for sheet under-review rows whose GitHub application is
 * NOT in the open "ready for review" set (e.g. #333, closed as declined on
 * GitHub while the spreadsheet — the source of truth — still lists it under
 * review). The sheet has no requested-amount column, so the issue body is the
 * only public source; issue state never overrides the sheet's verdict here,
 * it only supplies the number.
 *
 * Warmed by the in-process cron; pages read the in-memory cache only. Cached
 * 24h per issue (closed applications don't change), including deleted issues
 * (404 → null) so they are not refetched every run.
 */

const GH_ISSUE = (n: number) =>
  `https://api.github.com/repos/ZcashCommunityGrants/zcashcommunitygrants/issues/${n}`;
const TTL_MS = 24 * 60 * 60 * 1000;

type Entry = { amountUsd: number | null; missing: boolean; at: number };
type Store = { byNumber: Map<number, Entry>; warming: boolean };

// globalThis singleton: Next bundles routes/pages as separate module graphs,
// so module-level state would not be shared between the cron and the page.
const g = globalThis as unknown as { __zcgIssueAmounts?: Store };
const store: Store = (g.__zcgIssueAmounts ??= {
  byNumber: new Map(),
  warming: false,
});

export async function warmIssueAmounts(): Promise<{
  ok: boolean;
  fetched: number;
}> {
  if (store.warming) return { ok: true, fetched: 0 };
  store.warming = true;
  try {
    const [all, apps] = await Promise.all([
      listProposals({}),
      getGrantApplications(100),
    ]);
    // Skip only what the page's first-pass enrichment already covers: OPEN
    // ready-for-review applications. Anything else (closed, deleted, open but
    // already decided on GitHub) is fair game for amount recovery.
    const open = new Set(
      apps.filter((a) => a.status === "review").map((a) => a.number),
    );
    const now = Date.now();
    let fetched = 0;
    for (const p of all) {
      if (p.status !== "under_review") continue;
      const n = issueNumberFromLink(p.platformLink);
      if (n == null || open.has(n)) continue;
      const hit = store.byNumber.get(n);
      if (hit && now - hit.at < TTL_MS) continue;
      const issue = await fetchIssue(n);
      store.byNumber.set(n, {
        amountUsd: requestedAmountFromBody(issue.body),
        missing: issue.missing,
        at: Date.now(),
      });
      fetched++;
    }
    return { ok: true, fetched };
  } catch {
    return { ok: false, fetched: 0 };
  } finally {
    store.warming = false;
  }
}

async function fetchIssue(
  n: number,
): Promise<{ body?: string; missing: boolean }> {
  try {
    const res = await fetch(GH_ISSUE(n), {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "openzcash",
      },
      signal: AbortSignal.timeout(9_000),
      cache: "no-store",
    });
    // Deleted applications 404 — a fact worth surfacing (the page swaps the
    // dead link for an "application removed" marker). Other failures are
    // treated as transient: no amount this round, but not flagged missing.
    if (res.status === 404) return { missing: true };
    if (!res.ok) return { missing: false };
    const json = (await res.json()) as { body?: string };
    return { body: json.body ?? undefined, missing: false };
  } catch {
    return { missing: false };
  }
}

/** Cache-only read for page renders: never touches the network. */
export function getIssueAmounts(): Map<number, number | null> {
  const out = new Map<number, number | null>();
  for (const [n, e] of store.byNumber) out.set(n, e.amountUsd);
  return out;
}

/** Issue numbers whose application was deleted from GitHub (404). */
export function getMissingIssues(): Set<number> {
  const out = new Set<number>();
  for (const [n, e] of store.byNumber) if (e.missing) out.add(n);
  return out;
}
