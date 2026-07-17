import "server-only";
import { requestedAmountFromBody } from "./github-applications-parse";

/**
 * Live ZCG grant applications, read first-hand from the GitHub repo where they
 * are submitted as issues (ZcashCommunityGrants/zcashcommunitygrants) — the
 * rawest stage of the funnel, before anything reaches the spreadsheet.
 *
 * Open issues labelled "📋 Grant Application" are the applications; the
 * "👀 Ready For ZCG Review" ones are the live proposals awaiting the committee's
 * judgement. Cached ~15 min in-process to stay well within GitHub's
 * unauthenticated rate limit.
 */

const REPO = "ZcashCommunityGrants/zcashcommunitygrants";
const TTL_MS = 15 * 60_000;

export type AppStatus = "review" | "approved" | "paid" | "other";

export interface GrantApplication {
  number: number;
  title: string;
  url: string;
  applicant: string;
  createdAt: string; // ISO
  status: AppStatus;
  comments: number;
  /** "Requested Grant Amount (USD)" from the issue form, in whole USD, or null. */
  amountUsd: number | null;
}

interface GhLabel {
  name: string;
}
interface GhIssue {
  number: number;
  title: string;
  html_url: string;
  created_at: string;
  comments: number;
  body?: string;
  user?: { login?: string };
  labels?: GhLabel[];
  pull_request?: unknown;
}

let cache: { at: number; items: GrantApplication[] } | null = null;

function statusFromLabels(labels: string[]): AppStatus {
  const has = (s: string) => labels.some((l) => l.includes(s));
  if (has("Payment Completed")) return "paid";
  if (has("Grant Approved") || has("Approved")) return "approved";
  if (has("Declined") || has("Rejected") || has("Withdrawn")) return "other";
  if (has("Ready For ZCG Review") || has("Review")) return "review";
  // We only fetch OPEN issues, so an application with no decision label yet
  // (including freshly filed ones the committee has not triaged/labelled) is
  // awaiting judgement — e.g. #341 (KeepKey) was filed with no labels at all.
  return "review";
}

/** Grant applications are normally labelled, but re-applications filed outside
 * the issue form arrive with NO labels (e.g. #341) — recognise those by the
 * boilerplate title prefix. */
function isGrantApplication(labels: string[], title: string): boolean {
  return (
    labels.some((l) => l.includes("Grant Application")) ||
    /^\s*(zcg\s+)?grant\s+application\b/i.test(title)
  );
}

/** Strip the boilerplate "Grant Application - " prefix from an issue title. */
function cleanTitle(t: string): string {
  return t
    .replace(/^\s*(zcg\s+)?(grant\s+)?application\s+(draft\s*)?[-—:–]\s*/i, "")
    .replace(/^\s*grant\s+application\s*[-—:–]?\s*/i, "")
    .trim();
}

export async function getGrantApplications(
  limit = 40,
): Promise<GrantApplication[]> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.items.slice(0, limit);
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/issues?state=open&per_page=100&sort=created&direction=desc`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "openzcash",
        },
        signal: AbortSignal.timeout(9_000),
        cache: "no-store",
      },
    );
    if (!res.ok) return cache?.items.slice(0, limit) ?? [];
    const arr = (await res.json()) as GhIssue[];
    if (!Array.isArray(arr)) return cache?.items.slice(0, limit) ?? [];

    const items: GrantApplication[] = arr
      .filter((it) => !it.pull_request)
      .map((it) => {
        const labels = (it.labels ?? []).map((l) => l.name);
        return { it, labels };
      })
      // Only real grant applications (drop meta/process issues).
      .filter(({ it, labels }) => isGrantApplication(labels, it.title))
      .map(({ it, labels }) => ({
        number: it.number,
        title: cleanTitle(it.title) || it.title,
        url: it.html_url,
        applicant: it.user?.login ?? "",
        createdAt: it.created_at,
        status: statusFromLabels(labels),
        comments: it.comments ?? 0,
        amountUsd: requestedAmountFromBody(it.body),
      }));

    if (items.length === 0) return cache?.items.slice(0, limit) ?? [];
    cache = { at: now, items };
    return items.slice(0, limit);
  } catch {
    return cache?.items.slice(0, limit) ?? [];
  }
}

/** One under-review proposal, shaped for the 3D office (one zebra each).
 * Built by `officeUnderReview` in proposals-repo, which reconciles this GitHub
 * "review" list against the spreadsheet (the sheet is authoritative for status,
 * so an issue left review-labelled after the sheet decided it is excluded). */
export interface OfficeProposalDTO {
  /** GitHub issue number — a stable id for diffing/keys across refreshes. */
  number: number;
  title: string;
  amount: number | null;
  applicant: string;
  /** Submission date (YYYY-MM-DD) — bounds time-sensitive signal matching. */
  createdAt: string;
}

export const ZCG_APPLICATIONS_REPO_URL = `https://github.com/${REPO}/issues`;
