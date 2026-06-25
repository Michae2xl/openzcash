import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  /** Golden tint + hover, signalling the card is clickable. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm ring-1 ring-inset",
        interactive
          ? "cursor-pointer border-amber-500/30 bg-gradient-to-br from-amber-500/[0.09] to-white shadow-amber-600/10 ring-amber-500/10 transition hover:border-amber-500/50 hover:shadow-md hover:shadow-amber-600/15"
          : "border-stone-200 bg-gradient-to-b from-white to-stone-50 shadow-stone-300/40 ring-stone-900/5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-600">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

// Gold is the brand default. `in`/`out` stay reserved for genuine cash flows
// (treasury inflow/outflow, budget over/under) — everywhere else reads as gold.
const GOLD_BAR = "bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600";
const GOLD_VALUE =
  "bg-gradient-to-br from-amber-700 via-amber-600 to-amber-500 bg-clip-text text-transparent";

const STAT_ACCENT = {
  default: { bar: GOLD_BAR, value: GOLD_VALUE },
  gold: { bar: GOLD_BAR, value: GOLD_VALUE },
  warn: { bar: GOLD_BAR, value: GOLD_VALUE },
  in: {
    bar: "bg-gradient-to-b from-emerald-300 to-emerald-600",
    value: "text-emerald-700",
  },
  out: {
    bar: "bg-gradient-to-b from-rose-300 to-rose-600",
    value: "text-rose-700",
  },
} as const;

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof STAT_ACCENT;
}) {
  const a = STAT_ACCENT[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-b from-white to-stone-50 p-4 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5 transition duration-300 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-700/10">
      {/* soft gold glow, brightening on hover */}
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-amber-400/15 blur-2xl transition-opacity duration-300 group-hover:bg-amber-400/25" />
      <span
        className={cn(
          "absolute left-0 top-4 h-[calc(100%-2rem)] w-1 rounded-r-full shadow-[0_0_8px] shadow-amber-500/20",
          a.bar,
        )}
      />
      <p className="relative pl-3 text-[11px] font-semibold uppercase tracking-wider text-stone-600">
        {label}
      </p>
      <p
        className={cn(
          "num-lg relative mt-1.5 pl-3 pr-2 text-2xl font-semibold leading-none tracking-tight tnum",
          a.value,
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="relative mt-1.5 truncate pl-3 text-xs text-stone-600 tnum">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

type Tone = "emerald" | "rose" | "amber" | "zinc";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  rose: "bg-rose-500/10 text-rose-700 ring-rose-500/25",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  zinc: "bg-stone-100 text-stone-700 ring-stone-300",
};

export function Badge({
  children,
  tone = "zinc",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({
  status,
}: {
  status: "matched" | "exception" | "info";
}) {
  const map = {
    matched: { tone: "emerald" as const, label: "Reconciled" },
    exception: { tone: "rose" as const, label: "Exception" },
    info: { tone: "zinc" as const, label: "Informational" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Address/hash truncated in the middle, in mono font: avoids overflow. */
export function Mono({
  value,
  head = 10,
  tail = 6,
}: {
  value: string;
  head?: number;
  tail?: number;
}) {
  const short =
    value.length > head + tail + 1
      ? `${value.slice(0, head)}…${value.slice(-tail)}`
      : value;
  return (
    <span className="font-mono text-xs text-stone-600" title={value}>
      {short}
    </span>
  );
}
