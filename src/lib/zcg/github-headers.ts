import "server-only";

/**
 * Shared headers for GitHub API calls. Railway egress rides a shared NAT
 * pool, so the unauthenticated 60/h per-IP limit is a lottery against other
 * tenants — set GITHUB_TOKEN (fine-grained, public-repo read-only) to get a
 * dedicated 5000/h budget. Works fine without it, just less reliably.
 */
export function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "openzcash",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}
