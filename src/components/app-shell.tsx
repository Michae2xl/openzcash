import type { ReactNode } from "react";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { BackButton } from "./back-button";

/**
 * Thin top bar only: navigation lives entirely in the app launcher (the home).
 * No sidebar. Every internal screen gets a logo and an "Apps" link back home.
 */
export function AppShell({
  children,
  isAdmin = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className="app-vignette min-h-screen">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <BackButton />
            <Link href="/" className="flex items-center gap-2.5">
              <img
                src="/zbo-emblem.png"
                alt="Zcash Back Office"
                className="h-8 w-8 object-contain"
              />
              <span className="hidden text-sm font-semibold tracking-tight text-stone-900 sm:block">
                Zcash Back Office
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="w-20">
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-700"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[90rem] px-4 py-6 sm:px-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
