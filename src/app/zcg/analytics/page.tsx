import Link from "next/link";
import { Card, PageHeader, Stat } from "@/components/ui";
import { BarList } from "@/components/bar-list";
import { Synced } from "@/components/synced";
import { formatUsdCents } from "@/lib/zcg/format";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import { monthlySpend } from "@/lib/zcg/analytics-repo";
import { recipientTotalsFromSheet } from "@/lib/zcg/totals-repo";
import { listGrants } from "@/lib/zcg/grants-repo";
import { listDisbursements } from "@/lib/zcg/disbursements-repo";
import { disbTypeLabel } from "@/lib/zcg/format";
import { nowMs } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights ZCG · OpenZcash" };

const MS_PER_DAY = 86_400_000;

function monthLabel(m: string): string {
  const [y, mo] = m.split("-");
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const i = Number(mo) - 1;
  return `${names[i] ?? mo} ${y.slice(2)}`;
}

export default async function AnalyticsPage() {
  const [months, recips, grants, secBounties, matchBounties] =
    await Promise.all([
      cached("an:monthly", LEDGER_TTL_MS, () => monthlySpend()),
      cached("an:recips", LEDGER_TTL_MS, () =>
        recipientTotalsFromSheet("zcg_grants"),
      ),
      cached("an:grants", LEDGER_TTL_MS, () => listGrants()),
      cached("an:bounty:sec", LEDGER_TTL_MS, () =>
        listDisbursements({ type: "security_bounty", limit: 200 }),
      ),
      cached("an:bounty:match", LEDGER_TTL_MS, () =>
        listDisbursements({ type: "bounty_match", limit: 200 }),
      ),
    ]);

  // ── #6 Spend over time ──
  const totalPaid = months.reduce((s, m) => s + Number(m.usdCents), 0);
  const last12 = months.slice(-12);
  const burn12 = last12.length
    ? last12.reduce((s, m) => s + Number(m.usdCents), 0) / last12.length
    : 0;
  const busiest = months.reduce(
    (mx, m) =>
      Number(m.usdCents) > mx.v ? { m: m.month, v: Number(m.usdCents) } : mx,
    { m: "", v: 0 },
  );
  const monthBars = months.slice(-24).map((m) => ({
    label: monthLabel(m.month),
    value: Number(m.usdCents),
    display: formatUsdCents(Number(m.usdCents), { compact: true }),
  }));

  // ── #9 Funding concentration ──
  const external = recips
    .filter((r) => !r.isInternalBucket)
    .map((r) => Number(r.usdPaidToDateCents))
    .sort((a, b) => b - a);
  const extTotal = external.reduce((s, v) => s + v, 0) || 1;
  const shareOf = (n: number) =>
    (external.slice(0, n).reduce((s, v) => s + v, 0) / extTotal) * 100;
  const top1 = shareOf(1);
  const top10 = shareOf(10);
  const top25 = shareOf(25);

  // ── #12 Grant velocity & stalled ──
  const withMs = grants.filter((g) => g.milestoneCount > 0);
  const fullyPaid = withMs.filter(
    (g) => g.paidCount >= g.milestoneCount,
  ).length;
  const fullyPaidPct = withMs.length
    ? Math.round((fullyPaid / withMs.length) * 100)
    : 0;
  const isClosed = (s: string | null) =>
    !!s && /cancel|complet|closed|done/i.test(s);
  const stalled = grants
    .filter(
      (g) =>
        g.milestoneCount > 0 &&
        g.paidCount < g.milestoneCount &&
        !isClosed(g.status) &&
        (!g.lastPaid ||
          nowMs() - new Date(g.lastPaid).getTime() > 270 * MS_PER_DAY),
    )
    .sort((a, b) => (a.lastPaid ?? "").localeCompare(b.lastPaid ?? ""))
    .slice(0, 12);

  // ── #11 Bounties ──
  const bounties = [...secBounties, ...matchBounties]
    .map((d) => ({
      id: d.id,
      recipient: d.recipientNameRaw,
      project: d.project ?? d.deliverable ?? "",
      type: disbTypeLabel(d.disbursementType),
      usd: d.amountUsdCents != null ? Number(d.amountUsdCents) : 0,
      date: d.paidOutDate ?? "",
    }))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const bountyTotal = bounties.reduce((s, b) => s + b.usd, 0);

  return (
    <>
      <PageHeader
        title="Insights"
        subtitle="Trends the raw tables don't show — derived entirely from the disbursement ledger and totals we already import. No new data, just the questions people actually ask."
      />

      {/* #6 Spend over time */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Spend over time
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat
            label="Paid to date"
            value={formatUsdCents(totalPaid, { compact: true })}
            sub="settled milestones"
            tone="warn"
          />
          <Stat
            label="Avg monthly burn"
            value={formatUsdCents(burn12, { compact: true })}
            sub="trailing 12 months"
          />
          <Stat
            label="Busiest month"
            value={formatUsdCents(busiest.v, { compact: true })}
            sub={busiest.m ? monthLabel(busiest.m) : "n/a"}
          />
        </div>
        <Card>
          <p className="mb-2 text-xs text-stone-500">
            Monthly paid disbursements · last 24 months
          </p>
          <BarList items={monthBars} />
        </Card>
      </section>

      {/* #9 Funding concentration */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          How concentrated is the funding?
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="Top recipient"
            value={`${top1.toFixed(1)}%`}
            sub="of all grants"
          />
          <Stat
            label="Top 10"
            value={`${top10.toFixed(1)}%`}
            sub={`of ${external.length} recipients`}
            tone="warn"
          />
          <Stat
            label="Top 25"
            value={`${top25.toFixed(1)}%`}
            sub="of all grants"
          />
        </div>
      </section>

      {/* #12 Grant velocity & stalled */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Grant delivery
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat
            label="Grants"
            value={String(withMs.length)}
            sub="with milestones"
          />
          <Stat
            label="Fully delivered"
            value={`${fullyPaidPct}%`}
            sub={`${fullyPaid} of ${withMs.length} paid out`}
          />
          <Stat
            label="Possibly stalled"
            value={String(stalled.length)}
            sub="open milestones, quiet 9m+"
            tone={stalled.length > 0 ? "warn" : "default"}
          />
        </div>
        {stalled.length > 0 ? (
          <Card className="p-0">
            <div className="divide-y divide-stone-100">
              {stalled.map((g) => (
                <Link
                  key={g.grantKey}
                  href={`/zcg/grant?g=${encodeURIComponent(g.grantKey)}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-stone-50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-stone-800">
                    {g.grantKey}
                  </span>
                  <span className="shrink-0 text-xs text-stone-500 tnum">
                    {g.paidCount}/{g.milestoneCount} paid
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-stone-400 tnum">
                    {g.lastPaid || "never"}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        ) : null}
      </section>

      {/* #11 Bounties */}
      {bounties.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-stone-700">
            Bounties paid
          </h2>
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-2.5 text-xs text-stone-500">
              <span>{bounties.length} bounty payments</span>
              <span className="font-medium text-amber-700 tnum">
                {formatUsdCents(bountyTotal, { compact: true })} total
              </span>
            </div>
            <div className="divide-y divide-stone-100">
              {bounties.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-stone-800">
                    {b.recipient}
                    {b.project ? (
                      <span className="ml-2 font-normal text-stone-400">
                        {b.project}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 rounded bg-sky-500/10 px-1.5 py-px text-[10px] font-medium text-sky-700">
                    {b.type}
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-stone-600 tnum">
                    {formatUsdCents(b.usd, { compact: true })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      <Synced />
    </>
  );
}
