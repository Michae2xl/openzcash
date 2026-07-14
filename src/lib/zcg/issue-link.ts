/**
 * Pure helper: extract the issue number from a ZCG application link. Kept free
 * of "server-only" so it can be unit-tested and shared with page code.
 */

const ISSUE_URL =
  /github\.com\/ZcashCommunityGrants\/zcashcommunitygrants\/issues\/(\d+)/i;

/** Issue number from a sheet platform link, or null for non-issue links. */
export function issueNumberFromLink(
  link: string | null | undefined,
): number | null {
  if (!link) return null;
  const m = link.match(ISSUE_URL);
  return m ? Number(m[1]) : null;
}
