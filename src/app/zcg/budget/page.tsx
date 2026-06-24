import { Card, PageHeader } from "@/components/ui";
import { budgetSnapshot } from "@/lib/zcg/snapshots-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZCG Budget · ZEC Back-office" };

function pct(part: bigint, whole: bigint): number {
  if (whole <= 0n) return 0;
  return Math.min(100, Number((part * 1000n) / whole) / 10);
}

export default async function ZcgBudgetPage() {
  const rows = await budgetSnapshot();
  const by = new Map(rows.map((r) => [r.label, r]));
  const annualUsd = by.get("annual_budget")?.usdCents ?? 0n;
  const spentUsd = by.get("spent_to_date")?.usdCents ?? 0n;
  const annualZec = by.get("annual_budget")?.zecZat ?? 0n;
  const spentZec = by.get("spent_to_date")?.zecZat ?? 0n;

  const remUsd = annualUsd - spentUsd;
  const remZec = annualZec - spentZec;
  const usdOver = remUsd < 0n;

  return (
    <>
      <PageHeader
        title="Discretionary budget"
        subtitle="The annual budget for the ZCG discretionary allocation, in both USD and ZEC. The two currencies diverge because ZEC is budgeted as a fixed quantity but spent at variable prices, so they do not reconcile as the same account."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Budget in USD
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900 tnum">
            {formatUsdCents(annualUsd)}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={`h-full rounded-full ${usdOver ? "bg-rose-500/80" : "bg-amber-500/80"}`}
              style={{ width: `${pct(spentUsd, annualUsd)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-stone-500">
              Spent{" "}
              <span className="font-medium text-stone-800 tnum">
                {formatUsdCents(spentUsd)}
              </span>
            </span>
            <span
              className={`font-medium tnum ${usdOver ? "text-rose-600" : "text-emerald-600"}`}
            >
              {usdOver ? "Over by " : "Remaining "}
              {formatUsdCents(remUsd < 0n ? -remUsd : remUsd)}
            </span>
          </div>
          {usdOver ? (
            <p className="mt-2 text-xs text-rose-600/80">
              Spent {pct(spentUsd, annualUsd).toFixed(0)}% of the annual budget
              in USD.
            </p>
          ) : null}
        </Card>

        <Card>
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
            Budget in ZEC
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-stone-900 tnum">
            {formatZec(annualZec, { symbol: false })}{" "}
            <span className="text-lg text-stone-500">ZEC</span>
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-sky-500/70"
              style={{ width: `${pct(spentZec, annualZec)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-stone-500">
              Spent{" "}
              <span className="font-medium text-stone-800 tnum">
                {formatZec(spentZec, { symbol: false })}
              </span>
            </span>
            <span className="font-medium text-emerald-600 tnum">
              Remaining {formatZec(remZec, { symbol: false })}
            </span>
          </div>
        </Card>
      </section>

      <Card className="mt-6 border-amber-500/20 bg-amber-500/[0.06]">
        <p className="text-sm text-amber-800/80">
          <span className="font-medium text-amber-800">
            Why USD and ZEC diverge:
          </span>{" "}
          the budget was fixed at {formatZec(annualZec, { symbol: false })} ZEC
          (≈ {formatUsdCents(annualUsd)} at the time). As ZEC appreciated, USD
          spending {usdOver ? "exceeded" : "approached"} the cap, but in ZEC
          terms there are still {formatZec(remZec, { symbol: false })}{" "}
          available. These are two readings of the same wallet, so the two
          currencies should never be added together.
        </p>
      </Card>
    </>
  );
}
