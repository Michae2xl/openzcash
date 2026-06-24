import Link from "next/link";
import { AppLauncher } from "@/components/app-launcher";
import { LogoutButton } from "@/components/logout-button";
import { getIsAdmin } from "@/lib/auth/admin";
import { TreasuryOverview } from "./treasury-overview";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZBO · Zcash Back Office" };

export default async function LauncherPage() {
  const isAdmin = await getIsAdmin();

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
              <p className="text-xs text-stone-500">
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
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-700"
              >
                Admin sign in
              </Link>
            )}
          </div>
        </header>

        <TreasuryOverview />

        <AppLauncher isAdmin={isAdmin} />

        <p className="mt-10 text-center text-xs text-stone-400">
          Public transparency for the Zcash Dev Fund · ZCG and FPF grant
          accounting.
        </p>
      </div>
    </div>
  );
}
