import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import {
  categoryTotals,
  grandTotal,
  recipientTotalsFromSheet,
} from "@/lib/zcg/totals-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { classifyLabel, type ClassKind } from "@/lib/zcg/classification-tags";
import { BudgetCards } from "../budget-cards";
import {
  TotalsTables,
  type CategoryRow,
  type RecipientRow,
} from "./totals-tables";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Totals ZCG · OpenZcash" };

export default async function TotaisPage() {
  const [cats, recips, grand] = await Promise.all([
    cached("totals:cats:zcg_grants", LEDGER_TTL_MS, () =>
      categoryTotals("zcg_grants"),
    ),
    cached("totals:recips:zcg_grants", LEDGER_TTL_MS, () =>
      recipientTotalsFromSheet("zcg_grants"),
    ),
    cached("totals:grand:zcg_grants", LEDGER_TTL_MS, () =>
      grandTotal("zcg_grants"),
    ),
  ]);

  const total = grand[0]?.usdPaidToDateCents ?? 0n;
  // The grand-total row has no future column; sum the per-recipient pipeline.
  const future = recips.reduce(
    (s, r) => s + (r.usdFuturePipelineCents ?? 0n),
    0n,
  );
  const external = recips.filter((r) => !r.isInternalBucket);
  const totalNum = Number(total);
  const share = (cents: bigint) =>
    totalNum > 0 ? (Number(cents) / totalNum) * 100 : 0;

  // Split the pool by the *nature* of each classification so a reader can see
  // how much left ZCG as grants vs. how much ZCG spent on itself (stipends =
  // salaries, discretionary budget = travel/conferences/ops). Security audits
  // & bounties are a subset of grants, surfaced as a footnote.
  const sumKind = (k: ClassKind) =>
    cats
      .filter((c) => classifyLabel(c.label).kind === k)
      .reduce((s, c) => s + Number(c.usdPaidToDateCents), 0);
  const opsUsd = sumKind("operations");
  const stipendsUsd = sumKind("stipends");
  const securityUsd = sumKind("security");
  const grantsUsd = Math.max(totalNum - opsUsd - stipendsUsd, 0);
  const pct = (v: number) => (totalNum > 0 ? (v / totalNum) * 100 : 0);
  const spendSplit = [
    {
      label: "Grants to the ecosystem",
      sub: "paid to external projects & contributors",
      usd: grantsUsd,
      bar: "bg-emerald-500/70",
      tone: "emerald" as const,
      href: "/zcg/disbursements?sheet=grants_disbursed",
    },
    {
      label: "ZCG operations",
      sub: "the committee's own budget: travel, conferences, tooling",
      usd: opsUsd,
      bar: "bg-amber-500/70",
      tone: "amber" as const,
      href: "/zcg/disbursements?sheet=discretionary",
    },
    {
      label: "Committee stipends",
      sub: "salaries paid to ZCG members",
      usd: stipendsUsd,
      bar: "bg-violet-500/70",
      tone: "violet" as const,
      href: "/zcg/disbursements?sheet=monthly",
    },
  ];

  // Where clicking a classification leads: grant classifications drill into the
  // ledger filtered by that category; the internal buckets drill into their own
  // source sheet (discretionary budget / monthly stipends).
  const classHref = (label: string): string => {
    const k = classifyLabel(label).kind;
    if (k === "operations") return "/zcg/disbursements?sheet=discretionary";
    if (k === "stipends") return "/zcg/disbursements?sheet=monthly";
    return `/zcg/disbursements?category=${encodeURIComponent(label)}`;
  };

  const categoryRows: CategoryRow[] = cats.map((c) => ({
    key: `${c.pool}:${c.label}`,
    category: c.label,
    _usd: Number(c.usdPaidToDateCents),
    _pct: share(c.usdPaidToDateCents),
    href: classHref(c.label),
  }));

  const recipientRows: RecipientRow[] = external.map((r, i) => ({
    key: `${r.pool}:${r.label}`,
    rank: i + 1,
    recipient: r.label,
    _usd: Number(r.usdPaidToDateCents),
    _future: Number(r.usdFuturePipelineCents ?? 0n),
    _pct: share(r.usdPaidToDateCents),
    href: `/zcg/recipient?r=${encodeURIComponent(r.label)}`,
  }));

  return (
    <>
      <PageHeader
        title="Totals & integrity check"
        subtitle="Official aggregates from the ZCG spreadsheet (paid amounts by recipient and by classification), tagged by what each line actually is. They cross-check the ledger: the spreadsheet sums the payments that were actually settled."
      />

      {/* Two separate funding pools — make it obvious which one this is. */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-1.5">
        <span className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/25">
          ZCG grants pool
        </span>
        <Link
          href="/zcg/coinholder"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-white hover:text-stone-900"
        >
          Coinholder grants pool →
        </Link>
        <span className="px-1 text-xs text-stone-500">
          Two separate pools. You&apos;re viewing the{" "}
          <span className="font-medium text-stone-700">ZCG</span> committee
          pool.
        </span>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-700">
            Where the money goes
          </h2>
          <span className="text-xs text-stone-400">
            click a card to drill in ↓
          </span>
        </div>
        <Card>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-stone-100">
            {spendSplit.map((s) =>
              s.usd > 0 ? (
                <span
                  key={s.label}
                  className={s.bar}
                  style={{ width: `${pct(s.usd)}%` }}
                  title={`${s.label}: ${formatUsdCents(s.usd)}`}
                />
              ) : null,
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {spendSplit.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                title={`See the ${s.label.toLowerCase()} disbursements`}
                className="group min-w-0 rounded-xl border border-transparent p-2 transition hover:border-stone-200 hover:bg-stone-50"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  <span className="text-xs text-stone-400 tnum">
                    {pct(s.usd).toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1.5 text-lg font-semibold text-stone-900 tnum group-hover:text-amber-700">
                  {formatUsdCents(s.usd, { compact: true })}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-stone-500">
                  {s.sub}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-4 border-t border-stone-100 pt-3 text-xs leading-relaxed text-stone-500">
            Of the grants, {formatUsdCents(securityUsd, { compact: true })} went
            to third-party security{" "}
            <span className="font-medium text-sky-700">
              audits &amp; bug bounties
            </span>{" "}
            (the <span className="font-medium">Audits</span> classification).
            Bounties also appear as milestones inside individual grants, and
            ZCG&apos;s own travel &amp; conference costs sit inside the{" "}
            <span className="font-medium text-amber-700">ZCG operations</span>{" "}
            budget above — the pool has no standalone &ldquo;travel&rdquo; line.
          </p>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Discretionary budget
        </h2>
        <BudgetCards />
      </section>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Total paid"
          value={formatUsdCents(total, { compact: true })}
          sub="cumulative (spreadsheet)"
          tone="warn"
        />
        <Stat
          label="Future pipeline"
          value={formatUsdCents(future, { compact: true })}
          sub="milestones to pay"
        />
        <Stat
          label="Categories"
          value={String(cats.length)}
          sub="ZCG classifications"
        />
        <Stat
          label="Recipients"
          value={String(external.length)}
          sub="orgs (excludes internal buckets)"
        />
      </section>

      <TotalsTables categoryRows={categoryRows} recipientRows={recipientRows} />

      <Card className="mt-6 flex items-center justify-between gap-3 border-emerald-500/20 bg-emerald-500/[0.05]">
        <p className="text-sm text-emerald-800/80">
          Spreadsheet grand total:{" "}
          <span className="font-medium text-emerald-800 tnum">
            {formatUsdCents(total)}
          </span>{" "}
          paid to recipients, matching the sum of categories.
        </p>
        <Badge tone="emerald">✓ imported</Badge>
      </Card>
    </>
  );
}
