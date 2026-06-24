import { cn } from "@/lib/utils";

/**
 * Lightweight horizontal bar chart (label · gold bar · value). Dependency-free
 * SVG-less bars so it stays cheap and on-brand. Sorted by the caller.
 */

export type BarItem = {
  label: string;
  value: number;
  /** Optional formatted value shown on the right (defaults to the raw value). */
  display?: string;
};

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
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-stone-700">{it.label}</span>
            <span className="shrink-0 font-medium text-stone-600 tnum">
              {it.display ?? String(it.value)}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
              style={{ width: `${Math.max((it.value / max) * 100, 1)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
