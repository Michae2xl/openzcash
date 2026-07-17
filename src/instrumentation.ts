/**
 * Server-process scheduler. The Railway web service is always-on, so it refreshes
 * the ZCG mirror itself — once shortly after boot, then every 6h — keeping the
 * public data current with the official spreadsheet without any external cron.
 *
 * Next.js calls register() once at server startup. Guarded to the Node runtime
 * and production only (no surprise imports in dev / edge). refreshZcg is
 * idempotent (per-tab delete + reinsert), so an overlapping stale-on-load run is
 * harmless.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  // Every 6h: the import is idempotent and cheap, and the signal warms are
  // TTL-guarded (applicant 6h, searches 24h), so most cycles only refresh
  // what actually went stale.
  const CYCLE_MS = 6 * 60 * 60 * 1000;

  const run = async () => {
    try {
      const { refreshZcg } = await import("@/lib/zcg/refresh");
      const r = await refreshZcg();
      console.log(`[cron] ZCG refresh ok=${r.ok} in ${r.ms}ms`);
    } catch (e) {
      console.error(
        "[cron] ZCG refresh failed:",
        e instanceof Error ? e.message : e,
      );
    }
    // Verdicts/amounts for sheet rows whose application left the open review
    // set (closed/deleted issues) run FIRST: they are cheap and they decide
    // what the under-review list shows, so the post-boot window in which a
    // GitHub-decided row transiently reads "under review" stays short.
    try {
      const { warmIssueAmounts } = await import("@/lib/zcg/issue-amounts");
      const a = await warmIssueAmounts();
      console.log(`[cron] issue amounts ok=${a.ok} fetched=${a.fetched}`);
    } catch (e) {
      console.error(
        "[cron] issue amounts warm failed:",
        e instanceof Error ? e.message : e,
      );
    }
    // Diligence signals for the under-review set. Long-running by design
    // (GitHub search API pacing), so it trails everything else.
    try {
      const { warmDiligence } = await import("@/lib/zcg/diligence");
      const d = await warmDiligence();
      console.log(`[cron] diligence ok=${d.ok} proposals=${d.proposals}`);
    } catch (e) {
      console.error(
        "[cron] diligence warm failed:",
        e instanceof Error ? e.message : e,
      );
    }
  };

  // A short delay so the DB/migrations are settled before the first run.
  setTimeout(run, 30_000);
  setInterval(run, CYCLE_MS);
}
