"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Premium "back" control that follows the trail ("calda") to the right parent:
 *   - deep drill-downs return to their own list (a grant → the grants list);
 *   - any other ZCG screen returns to the ZCG home, NOT the Apps launcher, so
 *     you stay inside the app you're browsing;
 *   - the ZCG home (and every other top-level screen) returns to Apps.
 */
const DRILLDOWN: Record<string, { href: string; label: string }> = {
  "/zcg/grant": { href: "/zcg/grants", label: "Grants" },
  "/zcg/recipient": { href: "/zcg/recipients", label: "Recipients" },
};

export function BackButton() {
  const pathname = usePathname();
  const dest =
    DRILLDOWN[pathname] ??
    (pathname.startsWith("/zcg/")
      ? { href: "/zcg", label: "ZCG" }
      : { href: "/", label: "Apps" });

  return (
    <Link
      href={dest.href}
      className="group inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white py-1.5 pl-2 pr-3 text-xs font-medium text-stone-600 shadow-sm shadow-stone-300/30 transition hover:border-stone-300 hover:text-stone-900"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className="transition-transform group-hover:-translate-x-0.5"
      >
        <path
          d="M10 3.5 L5.5 8 L10 12.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {dest.label}
    </Link>
  );
}
