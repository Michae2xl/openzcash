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
  const [months, recips, grants, allDisb, secBounties, matchBounties] =
    await Promise.all([
      cached("an:monthly", LEDGER_TTL_MS, () => monthlySpend()),
      cached("an:recips", LEDGER_TTL_MS, () =>
        recipientTotalsFromSheet("zcg_grants"),
      ),
      cached("an:grants", LEDGER_TTL_MS, () => listGrants()),
      cached("an:disb:all", LEDGER_TTL_MS, () =>
        listDisbursements({ limit: 2000 }),
      ),
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
    href: `/zcg/disbursements?month=${m.month}`,
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

  // ── #12 Grant delivery ──
  const withMs = grants.filter((g) => g.milestoneCount > 0);
  const fullyPaid = withMs.filter(
    (g) => g.paidCount >= g.milestoneCount,
  ).length;
  const fullyPaidPct = withMs.length
    ? Math.round((fullyPaid / withMs.length) * 100)
    : 0;
  const isClosed = (s: string | null) =>
    !!s && /cancel|complet|closed|done/i.test(s);
  const inDelivery = withMs.filter(
    (g) => g.paidCount < g.milestoneCount && !isClosed(g.status),
  ).length;

  // ── Where the money flows now: paid last 12 months by category, and how each
  // category's share compares with its all-time share (momentum in pp). ──
  const cutoffIso = new Date(nowMs() - 365 * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  const catAll = new Map<string, number>();
  const cat12 = new Map<string, number>();
  for (const d of allDisb) {
    if (!d.isPaid || !d.category || d.amountUsdCents == null) continue;
    const usd = Number(d.amountUsdCents);
    catAll.set(d.category, (catAll.get(d.category) ?? 0) + usd);
    if ((d.paidOutDate ?? "") >= cutoffIso)
      cat12.set(d.category, (cat12.get(d.category) ?? 0) + usd);
  }
  const totalAllCat = [...catAll.values()].reduce((s, v) => s + v, 0) || 1;
  const total12Cat = [...cat12.values()].reduce((s, v) => s + v, 0) || 1;
  const momentum = [...catAll.keys()]
    .map((c) => {
      const paid12 = cat12.get(c) ?? 0;
      const share12 = (paid12 / total12Cat) * 100;
      const shareAll = ((catAll.get(c) ?? 0) / totalAllCat) * 100;
      return { category: c, paid12, deltaPp: share12 - shareAll };
    })
    .sort((a, b) => b.paid12 - a.paid12);
  const heating = [...momentum].sort((a, b) => b.deltaPp - a.deltaPp)[0];
  const cooling = [...momentum].sort((a, b) => a.deltaPp - b.deltaPp)[0];
  const flowBars = momentum
    .filter((m) => m.paid12 > 0)
    .slice(0, 10)
    .map((m) => ({
      label: m.category,
      value: m.paid12,
      display: `${formatUsdCents(m.paid12, { compact: true })} · ${
        m.deltaPp >= 0 ? "▲" : "▼"
      } ${Math.abs(m.deltaPp).toFixed(1)}pp`,
      href: `/zcg/disbursements?category=${encodeURIComponent(m.category)}`,
    }));

  // ── #11 Bounties ──
  const bounties = [...secBounties, ...matchBounties]
    .map((d) => ({
      id: d.id,
      recipient: d.recipientNameRaw,
      project: d.project ?? d.deliverable ?? "",
      type: disbTypeLabel(d.disbursementType),
      rawType: d.disbursementType,
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
          <Link href="/zcg/disbursements" className="block">
            <Stat
              label="Paid to date"
              value={formatUsdCents(totalPaid, { compact: true })}
              sub="settled milestones"
              tone="warn"
            />
          </Link>
          <Stat
            label="Avg monthly burn"
            value={formatUsdCents(burn12, { compact: true })}
            sub="trailing 12 months"
          />
          <Link
            href={
              busiest.m
                ? `/zcg/disbursements?month=${busiest.m}`
                : "/zcg/disbursements"
            }
            className="block"
          >
            <Stat
              label="Busiest month"
              value={formatUsdCents(busiest.v, { compact: true })}
              sub={busiest.m ? monthLabel(busiest.m) : "n/a"}
            />
          </Link>
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
          <Link href="/zcg/recipients" className="block">
            <Stat
              label="Top recipient"
              value={`${top1.toFixed(1)}%`}
              sub="of all grants"
            />
          </Link>
          <Link href="/zcg/recipients" className="block">
            <Stat
              label="Top 10"
              value={`${top10.toFixed(1)}%`}
              sub={`of ${external.length} recipients`}
              tone="warn"
            />
          </Link>
          <Link href="/zcg/recipients" className="block">
            <Stat
              label="Top 25"
              value={`${top25.toFixed(1)}%`}
              sub="of all grants"
            />
          </Link>
        </div>
      </section>

      {/* #12 Grant delivery */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Grant delivery
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Link href="/zcg/grants" className="block">
            <Stat
              label="Grants"
              value={String(withMs.length)}
              sub="with milestones"
            />
          </Link>
          <Link href="/zcg/grants" className="block">
            <Stat
              label="Fully delivered"
              value={`${fullyPaidPct}%`}
              sub={`${fullyPaid} of ${withMs.length} paid out`}
            />
          </Link>
          <Link href="/zcg/grants" className="block">
            <Stat
              label="In delivery"
              value={String(inDelivery)}
              sub="open, milestones remaining"
            />
          </Link>
        </div>
      </section>

      {/* Where the money flows now (category momentum) */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Where the money flows now
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Link href="/zcg/disbursements" className="block">
            <Stat
              label="Paid last 12 months"
              value={formatUsdCents(total12Cat, { compact: true })}
              sub="categorized grant spend"
              tone="warn"
            />
          </Link>
          {heating ? (
            <Link
              href={`/zcg/disbursements?category=${encodeURIComponent(heating.category)}`}
              className="block"
            >
              <Stat
                label="Heating up"
                value={heating.category}
                sub={`+${heating.deltaPp.toFixed(1)}pp vs all-time share`}
              />
            </Link>
          ) : null}
          {cooling ? (
            <Link
              href={`/zcg/disbursements?category=${encodeURIComponent(cooling.category)}`}
              className="block"
            >
              <Stat
                label="Cooling down"
                value={cooling.category}
                sub={`${cooling.deltaPp.toFixed(1)}pp vs all-time share`}
              />
            </Link>
          ) : null}
        </div>
        <Card>
          <p className="mb-2 text-xs text-stone-500">
            Paid in the last 12 months by category. The ▲▼ delta compares each
            category&apos;s share of the last 12 months with its all-time share,
            in percentage points: which themes the committee is leaning into,
            and which cycles have wound down.
          </p>
          <BarList items={flowBars} />
        </Card>
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
                <Link
                  key={b.id}
                  href={`/zcg/disbursements?type=${encodeURIComponent(b.rawType)}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition hover:bg-stone-50"
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
                </Link>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      <Synced />
    </>
  );
}
