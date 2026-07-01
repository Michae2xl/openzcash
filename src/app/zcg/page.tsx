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
  IconSwap,
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
  Icon: ComponentType<{ className?: string }>;
};

// App-style navigation into every ZCG detail screen.
const TILES: Tile[] = [
  {
    href: "/zcg/totals",
    label: "Totals",
    sub: "Where the money goes, by tag",
    Icon: IconChart,
  },
  {
    href: "/zcg/grants",
    label: "Grants",
    sub: "Approved projects (1 row = 1 grant)",
    Icon: IconGrant,
  },
  {
    href: "/zcg/disbursements",
    label: "Disbursements",
    sub: "The ledger, by milestone/payment",
    Icon: IconReceipt,
  },
  {
    href: "/zcg/recipients",
    label: "Recipients",
    sub: "Ranking by amount received",
    Icon: IconUsers,
  },
  {
    href: "/zcg/proposals",
    label: "Proposals",
    sub: "Governance funnel, by verdict",
    Icon: IconVote,
  },
  {
    href: "/zcg/conversion",
    label: "Proposal → grant",
    sub: "How many approvals became funded",
    Icon: IconSwap,
  },
  {
    href: "/zcg/analytics",
    label: "Insights",
    sub: "Burn-rate, concentration, delivery",
    Icon: IconArrowUp,
  },
  {
    href: "/zcg/stipends",
    label: "Stipends",
    sub: "What each committee member is paid",
    Icon: IconCoins,
  },
  {
    href: "/zcg/budget",
    label: "Budget",
    sub: "Discretionary budget (USD × ZEC)",
    Icon: IconBalance,
  },
  {
    href: "/zcg/coinholder",
    label: "Coinholder",
    sub: "The FPF-run grants pool",
    Icon: IconWallet,
  },
  {
    href: "/zcg/reconciliation",
    label: "Reconciliation",
    sub: "On-chain ↔ ledger check",
    Icon: IconShield,
  },
  {
    href: "/zcg/meetings",
    label: "Meetings",
    sub: "Committee minutes",
    Icon: IconNews,
  },
  {
    href: "/zcg/methodology",
    label: "How we compute this",
    sub: "Sources, tags & the public API",
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

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-700">Explore ZCG</h2>
          <span className="text-xs text-stone-400">
            tap a card for details ↓
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TILES.map((t) => (
            <Link key={t.href} href={t.href} className="group block">
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-4 shadow-sm shadow-stone-300/30 ring-1 ring-inset ring-stone-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-700/10">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/15">
                    <t.Icon className="h-4 w-4" />
                  </span>
                  <span className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-amber-500">
                    →
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 group-hover:text-amber-700">
                    {t.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-stone-500">
                    {t.sub}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
