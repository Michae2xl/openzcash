/**
 * Lightweight donut (pie) chart — dependency-free SVG with a legend. Warm
 * gold-leaning palette so it stays on-brand. Zero/empty items are dropped.
 */

export type DonutItem = {
  label: string;
  value: number;
  /** Optional formatted value shown in the legend (defaults to the raw value). */
  display?: string;
};

const COLORS = [
  "#b45309", // amber-700
  "#f59e0b", // amber-500
  "#fbbf24", // amber-400
  "#a16207", // yellow-700
  "#d97706", // amber-600
  "#ca8a04", // yellow-600
  "#92400e", // amber-800
  "#eab308", // yellow-500
  "#78716c", // stone-500
  "#a8a29e", // stone-400
];

export function DonutChart({
  items,
  maxSegments = 8,
  format,
}: {
  items: DonutItem[];
  maxSegments?: number;
  /** Formats a raw value for the legend when an item has no `display` (e.g. the grouped "Other"). */
  format?: (value: number) => string;
}) {
  const filtered = [...items]
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  if (filtered.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-stone-500">
        Nothing paid out yet.
      </p>
    );
  }

  // Group the long tail into "Other" so the donut stays readable.
  const data: DonutItem[] =
    filtered.length > maxSegments
      ? [
          ...filtered.slice(0, maxSegments - 1),
          {
            label: "Other",
            value: filtered
              .slice(maxSegments - 1)
              .reduce((s, i) => s + i.value, 0),
          },
        ]
      : filtered;

  const total = data.reduce((s, i) => s + i.value, 0) || 1;
  const SIZE = 148;
  const R = 58;
  const STROKE = 22;
  const C = 2 * Math.PI * R;

  const segs = data.map((it, i) => {
    const len = (it.value / total) * C;
    const offset = data
      .slice(0, i)
      .reduce((s, p) => s + (p.value / total) * C, 0);
    return { color: COLORS[i % COLORS.length], len, offset };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0"
        role="img"
        aria-label="Share by value"
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segs.map((s, i) => (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={STROKE}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </g>
        <text
          x={SIZE / 2}
          y={SIZE / 2 - 2}
          textAnchor="middle"
          className="fill-stone-900 text-lg font-semibold"
        >
          {data.length}
        </text>
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 13}
          textAnchor="middle"
          className="fill-stone-400 text-[9px] font-medium uppercase tracking-wider"
        >
          segments
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5 self-center">
        {data.map((it, i) => (
          <li
            key={it.label}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
                aria-hidden
              />
              <span className="truncate text-stone-700">{it.label}</span>
            </span>
            <span className="shrink-0 text-stone-600 tnum">
              {it.display ?? (format ? format(it.value) : String(it.value))}
              <span className="ml-1 text-stone-500">
                · {((it.value / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
