"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

/** Routes that render bare (no top bar): the launcher, login and onboarding. */
function isBare(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/onboarding")
  );
}

/**
 * Decides the chrome on the CLIENT via usePathname, so it reacts to client-side
 * navigation. Deciding this in the root layout (server) was stale: the layout
 * does not re-render on navigation, so the shell from one route leaked onto the
 * next, duplicating the header.
 */
export function ShellGate({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (isBare(pathname)) return <>{children}</>;
  return <AppShell isAdmin={isAdmin}>{children}</AppShell>;
}
