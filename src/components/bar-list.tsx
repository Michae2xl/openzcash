import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Lightweight horizontal bar chart (label · gold bar · value). Dependency-free
 * SVG-less bars so it stays cheap and on-brand. Sorted by the caller.
 * Give an item an `href` to make the whole row a drill-down link.
 */

export type BarItem = {
  label: string;
  value: number;
  /** Optional formatted value shown on the right (defaults to the raw value). */
  display?: string;
  /** Optional drill-down target — makes the row clickable. */
  href?: string;
};

/** Fixed value ramp across the whole track: green (small) → lime → gold →
 * amber → orange (large). Each bar reveals only its stretch of the ramp, so a
 * short bar stays green and a long one sweeps into orange — the colour at the
 * bar's end restates the value the length already encodes (reinforcement, not
 * the only encoding). */
const RAMP =
  "linear-gradient(90deg, #10b981, #84cc16, #eab308, #f59e0b, #ea580c)";

function Row({ it, max }: { it: BarItem; max: number }) {
  const pct = Math.max((it.value / max) * 100, 1);
  return (
    <>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="truncate text-stone-700 group-hover/bar:text-amber-800">
          {it.label}
        </span>
        <span className="shrink-0 font-medium text-stone-600 tnum group-hover/bar:text-amber-800">
          {it.display ?? String(it.value)}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundImage: RAMP,
            backgroundSize: `${(100 / pct) * 100}% 100%`,
            backgroundPosition: "left",
          }}
        />
      </div>
    </>
  );
}

export function BarList({
  items,
  className,
}: {
  items: BarItem[];
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className={cn("space-y-2.5", className)}>
      {items.map((it) =>
        it.href ? (
          <Link
            key={it.label}
            href={it.href}
            className="group/bar block rounded-md px-1 py-0.5 transition hover:bg-amber-500/[0.06]"
          >
            <Row it={it} max={max} />
          </Link>
        ) : (
          <div key={it.label}>
            <Row it={it} max={max} />
          </div>
        ),
      )}
    </div>
  );
}
