import Link from "next/link";
import { Badge, PageHeader, Stat } from "@/components/ui";
import {
  IconArrowUp,
  IconBalance,
  IconChart,
  IconCheck,
  IconCoins,
  IconGrant,
  IconNews,
  IconReceipt,
  IconShield,
  IconUsers,
  IconVote,
  IconWallet,
} from "@/components/icons";
import type { ComponentType } from "react";
import { disbursementsSummary } from "@/lib/zcg/disbursements-repo";
import { latestSnapshot } from "@/lib/zcg/snapshots-repo";
import { currentLockboxZec } from "@/lib/zcash/lockbox-live";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec, formatZecCompact } from "@/lib/zcash/units";
import { ElectionsSection } from "./elections-section";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZCG · OpenZcash" };

type Tile = {
  href: string;
  label: string;
  sub: string;
  grad: string;
  Icon: ComponentType<{ className?: string }>;
};

// App-style navigation into every ZCG detail screen — one colour per app.
const TILES: Tile[] = [
  {
    href: "/zcg/totals",
    label: "Totals",
    sub: "Where the money goes",
    grad: "from-amber-400 to-orange-500",
    Icon: IconChart,
  },
  {
    href: "/zcg/grants",
    label: "Grants",
    sub: "Approved projects",
    grad: "from-emerald-400 to-teal-500",
    Icon: IconGrant,
  },
  {
    href: "/zcg/disbursements",
    label: "Disbursements",
    sub: "The full ledger",
    grad: "from-sky-400 to-blue-500",
    Icon: IconReceipt,
  },
  {
    href: "/zcg/recipients",
    label: "Recipients",
    sub: "By amount received",
    grad: "from-violet-400 to-purple-500",
    Icon: IconUsers,
  },
  {
    href: "/zcg/proposals",
    label: "Proposals",
    sub: "Governance funnel",
    grad: "from-rose-400 to-pink-500",
    Icon: IconVote,
  },
  {
    href: "/zcg/analytics",
    label: "Insights",
    sub: "Burn-rate & delivery",
    grad: "from-fuchsia-400 to-purple-500",
    Icon: IconArrowUp,
  },
  {
    href: "/zcg/stipends",
    label: "Stipends",
    sub: "Committee pay",
    grad: "from-teal-400 to-cyan-500",
    Icon: IconCoins,
  },
  {
    href: "/zcg/budget",
    label: "Budget",
    sub: "Discretionary · USD × ZEC",
    grad: "from-orange-400 to-amber-500",
    Icon: IconBalance,
  },
  {
    href: "/zcg/coinholder",
    label: "Coinholder",
    sub: "FPF grants pool",
    grad: "from-cyan-400 to-sky-500",
    Icon: IconWallet,
  },
  {
    href: "/zcg/reconciliation",
    label: "Reconciliation",
    sub: "On-chain ↔ ledger",
    grad: "from-lime-400 to-emerald-500",
    Icon: IconShield,
  },
  {
    href: "/zcg/meetings",
    label: "Meetings",
    sub: "Committee minutes",
    grad: "from-pink-400 to-rose-500",
    Icon: IconNews,
  },
  {
    href: "/zcg/methodology",
    label: "Methodology",
    sub: "Sources & API",
    grad: "from-slate-400 to-slate-600",
    Icon: IconCheck,
  },
];

export default async function ZcgPage() {
  const [s, lockbox, zcg] = await Promise.all([
    disbursementsSummary(),
    currentLockboxZec(),
    latestSnapshot("zcg_operating"),
  ]);

  return (
    <>
      <PageHeader
        title="ZCG · Ecosystem grants"
        subtitle="Public accounting for Zcash Community Grants, imported from the official spreadsheet. An off-chain disbursement ledger that can be cross-referenced with the on-chain Lockbox/ZCG outflows."
      />

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.07] via-stone-50 to-stone-50 p-5 shadow-lg shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-700/70">
                Lockbox · Dev Fund vault
              </p>
              <p className="mt-1.5 break-words text-2xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-3xl">
                {lockbox != null ? formatZec(lockbox.zat) : "·"}
              </p>
              <p className="mt-2 text-xs text-stone-600">
                protocol pool (ZIP 1015/1016) · live · +0.1875 ZEC/block
              </p>
            </div>
            <Badge tone="amber">ZIP-271</Badge>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
                ZCG operating
              </p>
              <p className="mt-1.5 break-words text-2xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-3xl">
                {zcg?.zecBalanceZat != null
                  ? formatZec(zcg.zecBalanceZat)
                  : "·"}
              </p>
              <p className="mt-2 text-xs text-stone-600 tnum">
                {zcg?.usdCashBalanceCents != null
                  ? `+ ${formatUsdCents(zcg.usdCashBalanceCents)} in cash`
                  : "transparent address t3ev37Q2…"}
              </p>
            </div>
            <Badge tone="zinc">t-addr</Badge>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Grants"
          value={String(s.grantCount)}
          sub={`${s.paidCount} payments made`}
        />
        <Stat
          label="Total disbursed"
          value={formatUsdCents(s.usdTotalCents, { compact: true })}
          sub="budgeted in USD"
          tone="warn"
        />
        <Stat
          label="ZEC distributed"
          value={formatZecCompact(s.zecTotalZat, { symbol: false })}
          sub="on-chain total"
        />
        <Stat
          label="Recipients"
          value={String(s.recipientCount)}
          sub="orgs and individuals"
        />
      </section>

      <ElectionsSection />

      <section className="antialiased">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-700">Explore ZCG</h2>
          <span className="text-xs text-stone-400">tap a card ↓</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group block">
              <div className="flex h-full flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-sm shadow-stone-300/25 ring-1 ring-inset ring-stone-900/[0.04] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-stone-300 group-hover:shadow-md group-hover:shadow-stone-400/20 sm:flex-row sm:items-center sm:gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.grad} text-white shadow-md shadow-stone-500/20 ring-1 ring-inset ring-white/25 sm:h-11 sm:w-11`}
                >
                  <t.Icon className="h-6 w-6 sm:h-[22px] sm:w-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-tight tracking-tight text-stone-900 line-clamp-2 sm:truncate">
                    {t.label}
                  </p>
                  <p className="mt-0.5 hidden truncate text-xs font-medium text-stone-500 sm:block">
                    {t.sub}
                  </p>
                </div>
                <span className="hidden shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500 sm:block">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <Link href="/zcg/office" className="group block">
          <div className="relative overflow-hidden rounded-2xl border border-stone-800/60 bg-gradient-to-br from-stone-900 via-stone-900 to-violet-950 p-6 shadow-lg shadow-stone-400/30 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80 ring-1 ring-inset ring-white/15">
                  New · 3D
                </span>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Step into the ZCG Office
                </h2>
                <p className="mt-1 max-w-xl text-sm text-stone-300">
                  A living 3D room where every proposal under review walks the
                  floor as a zebra, in front of the committee.
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/15 transition group-hover:bg-white/15 sm:inline-flex">
                Enter{" "}
                <span className="transition group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </div>
        </Link>
      </section>
    </>
  );
}
