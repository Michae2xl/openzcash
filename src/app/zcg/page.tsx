import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import {
  IconArrowUp,
  IconBalance,
  IconCheck,
  IconCoins,
  IconList,
} from "@/components/icons";
import { disbursementsSummary } from "@/lib/zcg/disbursements-repo";
import { latestSnapshot } from "@/lib/zcg/snapshots-repo";
import { currentLockboxZec } from "@/lib/zcash/lockbox-live";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec, formatZecCompact } from "@/lib/zcash/units";
import { ElectionsSection } from "./elections-section";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZCG · OpenZcash" };

export default async function ZcgPage() {
  const [s, lockbox, zcg] = await Promise.all([
    disbursementsSummary(),
    currentLockboxZec(),
    latestSnapshot("zcg_operating"),
  ]);
  const maxCat = s.byCategory.reduce(
    (m, c) => (c.usdCents > m ? c.usdCents : m),
    0n,
  );

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
              <p className="mt-1.5 text-3xl font-bold leading-none tracking-tight text-stone-900 tnum">
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
              <p className="mt-1.5 text-3xl font-bold leading-none tracking-tight text-stone-900 tnum">
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

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="min-w-0 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-stone-700">
            Spending by category
          </h2>
          <Card className="space-y-3.5">
            {s.byCategory.map((c) => {
              const pct =
                maxCat > 0n ? Number((c.usdCents * 1000n) / maxCat) / 10 : 0;
              return (
                <div key={c.category}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-stone-700">
                      {c.category}
                    </span>
                    <span className="shrink-0 text-stone-600 tnum">
                      {formatUsdCents(c.usdCents, { compact: true })}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500/80 to-amber-400/50"
                      style={{ width: `${Math.max(pct, 1.5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        <section className="min-w-0 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-stone-700">Explore</h2>
          <div className="space-y-3">
            <Link href="/zcg/grants" className="block">
              <Card interactive className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <IconCoins className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-900">Grants</p>
                  <p className="text-xs text-stone-600">
                    Approved projects (1 row = 1 grant)
                  </p>
                </div>
              </Card>
            </Link>
            <Link href="/zcg/disbursements" className="block">
              <Card interactive className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <IconList className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    Disbursements
                  </p>
                  <p className="text-xs text-stone-600">
                    The ledger by milestone/payment
                  </p>
                </div>
              </Card>
            </Link>
            <Link href="/zcg/recipients" className="block">
              <Card interactive className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <IconCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-900">
                    Recipients
                  </p>
                  <p className="text-xs text-stone-600">
                    Ranking by amount received
                  </p>
                </div>
              </Card>
            </Link>
            <Link href="/zcg/budget" className="block">
              <Card interactive className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <IconBalance className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-900">Budget</p>
                  <p className="text-xs text-stone-600">
                    Discretionary budget (USD × ZEC)
                  </p>
                </div>
              </Card>
            </Link>
            <Card className="bg-white">
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
                By source
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {s.bySheet.map((b) => (
                  <li
                    key={b.sheet}
                    className="flex items-center justify-between gap-2 text-stone-600"
                  >
                    <span className="flex items-center gap-1.5">
                      <IconArrowUp className="h-3 w-3 text-stone-500" />
                      {b.sheet.replace(/_/g, " ")}
                    </span>
                    <span className="tnum text-stone-600">{b.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
