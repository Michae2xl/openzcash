"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Premium "back" control. By default every internal screen goes back to the
 * Apps home; only DRILL-DOWN pages (reached from within another screen) follow
 * their own trail ("calda") back to that parent — e.g. a grant detail returns
 * to the grants list, not to the home.
 */
const DRILLDOWN: Record<string, { href: string; label: string }> = {
  "/zcg/grant": { href: "/zcg/grants", label: "Grants" },
  "/zcg/reconciliacao": { href: "/zcg", label: "ZCG" },
};

export function BackButton() {
  const pathname = usePathname();
  const dest = DRILLDOWN[pathname] ?? { href: "/", label: "Apps" };

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
