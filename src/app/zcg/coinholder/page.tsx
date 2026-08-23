import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { currentLockboxZec } from "@/lib/zcash/lockbox-live";
import { currentZecUsdCents, zatToUsdCents } from "@/lib/pricing/live-price";
import {
  categoryTotals,
  grandTotal,
  recipientTotalsFromSheet,
} from "@/lib/zcg/totals-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { Synced } from "@/components/synced";
import { formatZec } from "@/lib/zcash/units";
import {
  TotalsTables,
  type CategoryRow,
  type RecipientRow,
} from "../totals/totals-tables";
import { COINHOLDER_ROUND, ROUND_BANDS } from "@/lib/zcg/coinholder-round";
import { RoundProposalsTable } from "./round-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coinholder Grants · OpenZcash" };

export default async function CoinholderPage() {
  const [lock, cats, recips, grand, liveCents] = await Promise.all([
    currentLockboxZec(),
    categoryTotals("coinholder"),
    recipientTotalsFromSheet("coinholder"),
    grandTotal("coinholder"),
    currentZecUsdCents(),
  ]);

  const total = grand[0]?.usdPaidToDateCents ?? 0n;
  const external = recips.filter((r) => !r.isInternalBucket);
  const totalNum = Number(total);
  const share = (cents: bigint) =>
    totalNum > 0 ? (Number(cents) / totalNum) * 100 : 0;

  const categoryRows: CategoryRow[] = cats.map((c) => ({
    key: `${c.pool}:${c.label}`,
    category: c.label,
    _usd: Number(c.usdPaidToDateCents),
    _pct: share(c.usdPaidToDateCents),
    href: `/zcg/disbursements?sheet=coinholder_grants&category=${encodeURIComponent(c.label)}`,
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

  const zec = lock?.zat ?? 0n;
  const priceCents = liveCents ?? lock?.snap?.zecusdPriceCents ?? null;
  const holdings =
    priceCents != null
      ? zatToUsdCents(zec, priceCents)
      : (lock?.snap?.usdTotalHoldingsCents ?? 0n);
  const receivables = lock?.snap?.zecReceivablesZat ?? 0n;

  return (
    <>
      <PageHeader
        title="Coinholder Grants"
        subtitle="The FPF-run Coinholder Grants program, funded from the ZIP-1016 Lockbox pool. Balances and totals mirror the ZCG public spreadsheet."
      />

      {/* Two separate funding pools — make it obvious which one this is. */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-1.5">
        <Link
          href="/zcg/totals"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-white hover:text-stone-900"
        >
          ← ZCG grants pool
        </Link>
        <span className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-500/25">
          Coinholder grants pool
        </span>
        <span className="px-1 text-xs text-stone-500">
          Two separate pools. You&apos;re viewing the{" "}
          <span className="font-medium text-stone-700">Coinholder</span> pool.
        </span>
      </div>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Current ZEC balance"
          value={formatZec(zec, { symbol: false })}
          sub="Lockbox · ZIP-1016 pool"
        />
        <Stat
          label="USD value of holdings"
          value={formatUsdCents(holdings, { compact: true })}
          sub={liveCents != null ? "at live price" : "at the day's price"}
        />
        <Stat
          label="USD value paid out to date"
          value={formatUsdCents(total, { compact: true })}
          sub="to recipients"
        />
        <Stat
          label="ZEC receivables"
          value={formatZec(receivables, { symbol: false })}
          sub="pending to the pool"
        />
      </section>

      {/* Open review round — curated from the FPF announcement, which runs
          ahead of the public sheet while submissions are still being logged. */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
            {COINHOLDER_ROUND.label} review round
            <Badge tone="amber">In review</Badge>
          </h2>
          <a
            href={COINHOLDER_ROUND.sourceThreadUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-amber-700 hover:text-amber-600"
          >
            FPF announcement ↗
          </a>
        </div>

        <Card className="mb-4 border-amber-500/25 bg-amber-500/[0.04]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-stone-800">
              <span className="font-semibold tnum">
                {COINHOLDER_ROUND.proposalCount} proposals
              </span>{" "}
              ·{" "}
              <span className="font-semibold text-amber-800 tnum">
                {formatUsdCents(COINHOLDER_ROUND.totalRequestedUsdCents)}
              </span>{" "}
              requested in total
            </p>
            <p className="text-xs text-stone-600">
              Review closes{" "}
              <span className="font-medium text-stone-800">
                {COINHOLDER_ROUND.reviewCloses}
              </span>{" "}
              · Coinholder poll opens{" "}
              <span className="font-medium text-stone-800">
                {COINHOLDER_ROUND.pollOpens}
              </span>
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {ROUND_BANDS.map((b) => (
              <div
                key={b.key}
                className="rounded-lg border border-stone-200 bg-white/70 px-3 py-2"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  {b.label}
                </p>
                <p className="mt-0.5 text-sm text-stone-800 tnum">
                  {b.count} proposals ·{" "}
                  {formatUsdCents(b.totalUsdCents, { compact: true })}{" "}
                  <span className="text-stone-500">({b.sharePct}%)</span>
                </p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-stone-600">
            Ballot options:{" "}
            <span className="text-stone-700">
              {COINHOLDER_ROUND.ballotOptions.join(" · ")}
            </span>
            . Both reject options tally as “no” votes. The lower-amount option
            only signals that the requested amount was the blocker.
          </p>

          <p className="mt-2 text-xs text-stone-500">
            Review evidence in each proposal&apos;s{" "}
            <a
              href={COINHOLDER_ROUND.githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-stone-300 underline-offset-2 hover:text-amber-700"
            >
              GitHub submission ↗
            </a>{" "}
            or grab the{" "}
            <a
              href={COINHOLDER_ROUND.dataDocUrl}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-stone-300 underline-offset-2 hover:text-amber-700"
            >
              full data doc ↗
            </a>{" "}
            to feed your preferred LLM.
          </p>
        </Card>

        <Card className="p-4">
          <RoundProposalsTable />
        </Card>
        <p className="mt-3 text-xs text-stone-500">
          {COINHOLDER_ROUND.proposalCount} proposals · announced by FPF on{" "}
          {COINHOLDER_ROUND.announcedOn} · the totals below only include grants
          already paid, not this round.
        </p>

        {/* Pre-vote diligence copilot — the coinholder counterpart of /zcg/copilot. */}
        <Link href="/zcg/coinholder/copilot" className="group mt-4 block">
          <div className="relative overflow-hidden rounded-2xl border border-stone-800/60 bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950 p-6 shadow-lg shadow-stone-400/30 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80 ring-1 ring-inset ring-white/15">
                  New · agent skill
                </span>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  Coinholder Copilot
                </h2>
                <p className="mt-1 max-w-xl text-sm text-stone-300">
                  Run diligence with your own agent before you vote. Every
                  applicant is checked against the payment ledger, prior round
                  verdicts, and submitted evidence, with a citation on every
                  figure.
                </p>
              </div>
              <span className="hidden shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/15 transition group-hover:bg-white/15 sm:inline-flex">
                Get the skill{" "}
                <span className="transition group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </div>
        </Link>
      </section>

      <TotalsTables categoryRows={categoryRows} recipientRows={recipientRows} />

      {total > 0n ? (
        <Card className="mt-6 flex items-center justify-between gap-3 border-emerald-500/20 bg-emerald-500/[0.05]">
          <p className="text-sm text-emerald-800/80">
            Coinholder Grants grand total:{" "}
            <span className="font-medium text-emerald-800 tnum">
              {formatUsdCents(total)}
            </span>{" "}
            paid out to date.
          </p>
          <Badge tone="emerald">Imported</Badge>
        </Card>
      ) : null}

      <Synced className="mt-6" />
    </>
  );
}
