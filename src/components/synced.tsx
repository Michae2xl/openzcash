import { cn } from "@/lib/utils";
import { latestImportAt } from "@/lib/zcg/freshness";
import { cached } from "@/lib/cache/memo";

/** Human "synced Xh ago" from a spreadsheet-import timestamp. */
export function syncedAgo(at: Date | null): string {
  if (!at) return "not imported yet";
  const mins = Math.floor((Date.now() - at.getTime()) / 60_000);
  if (mins < 1) return "synced just now";
  if (mins < 60) return `synced ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `synced ${hrs}h ago`;
  return `synced ${Math.floor(hrs / 24)}d ago`;
}

/**
 * Per-page data-freshness stamp. A public transparency dashboard should say how
 * fresh every number is, not just the home page. Cached briefly so dropping it
 * on many pages doesn't add a DB round-trip each.
 */
export async function Synced({ className }: { className?: string }) {
  const at = await cached("latestImportAt", 60_000, () => latestImportAt());
  return (
    <p className={cn("text-xs text-stone-400", className)}>
      Spreadsheet data {syncedAgo(at)} · auto-refreshes daily
    </p>
  );
}
