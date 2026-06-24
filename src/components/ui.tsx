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
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-stone-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}

const STAT_ACCENT = {
  default: { bar: "bg-stone-400", value: "text-stone-900" },
  in: { bar: "bg-emerald-500", value: "text-emerald-600" },
  out: { bar: "bg-rose-500", value: "text-rose-600" },
  warn: { bar: "bg-amber-500", value: "text-amber-700" },
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
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-4 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5 transition hover:border-stone-300">
      <span
        className={cn(
          "absolute left-0 top-4 h-[calc(100%-2rem)] w-1 rounded-r-full",
          a.bar,
        )}
      />
      <p className="pl-3 text-[11px] font-medium uppercase tracking-wider text-stone-500">
        {label}
      </p>
      <p
        className={cn(
          "num-lg mt-1.5 pl-3 pr-2 text-2xl font-semibold leading-none tracking-tight tnum",
          a.value,
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-1.5 truncate pl-3 text-xs text-stone-500 tnum">
          {sub}
        </p>
      ) : null}
    </div>
  );
}

type Tone = "emerald" | "rose" | "amber" | "zinc" | "sky";

const toneClasses: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  rose: "bg-rose-500/10 text-rose-700 ring-rose-500/25",
  amber: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  zinc: "bg-stone-100 text-stone-700 ring-stone-300",
  sky: "bg-sky-500/10 text-sky-700 ring-sky-500/25",
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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
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
    info: { tone: "sky" as const, label: "Informational" },
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
    <span className="font-mono text-xs text-stone-500" title={value}>
      {short}
    </span>
  );
}
