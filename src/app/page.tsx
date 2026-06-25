import Link from "next/link";
import { AppLauncher } from "@/components/app-launcher";
import { LogoutButton } from "@/components/logout-button";
import { getIsAdmin } from "@/lib/auth/admin";
import { latestImportAt, maybeAutoRefresh } from "@/lib/zcg/freshness";
import { TreasuryOverview } from "./treasury-overview";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZBO · Zcash Back Office" };

function syncedAgo(at: Date | null): string {
  if (!at) return "not imported yet";
  const mins = Math.floor((Date.now() - at.getTime()) / 60_000);
  if (mins < 1) return "synced just now";
  if (mins < 60) return `synced ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `synced ${hrs}h ago`;
  return `synced ${Math.floor(hrs / 24)}d ago`;
}

export default async function LauncherPage() {
  const [isAdmin, lastImport] = await Promise.all([
    getIsAdmin(),
    latestImportAt(),
  ]);
  // Self-heal: kick a background re-import if the spreadsheet data is stale.
  void maybeAutoRefresh();

  return (
    <div className="app-vignette min-h-screen">
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-16">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/zbo-emblem.png"
              alt="Zcash Back Office"
              className="h-11 w-11 object-contain"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-stone-900">
                Zcash Back Office
              </h1>
              <p className="text-xs text-stone-600">
                ZBO · Dev Fund treasury and public transparency
              </p>
            </div>
          </div>
          <div className="shrink-0">
            {isAdmin ? (
              <div className="w-20">
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-stone-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-700"
              >
                Admin sign in
              </Link>
            )}
          </div>
        </header>

        <AppLauncher isAdmin={isAdmin} />

        <TreasuryOverview />

        <p className="mt-10 text-center text-xs text-stone-500">
          Public transparency for the Zcash Dev Fund · ZCG and FPF grant
          accounting.
          <span className="mx-1 text-stone-300">·</span>
          Spreadsheet {syncedAgo(lastImport)}, auto-refreshes every 6h
        </p>
      </div>
    </div>
  );
}
