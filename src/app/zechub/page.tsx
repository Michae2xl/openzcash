import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import {
  getZechubProposals,
  ZECHUB_DAO_URL,
  type ZechubProposal,
} from "@/lib/dao/zechub";
import {
  latestTreasurySnapshot,
  treasuryAllocations,
  treasuryPayouts,
  treasurySeries,
  type TreasuryPayoutRow,
} from "@/lib/zechub/treasury-repo";
import { titlesMatch } from "@/lib/zcg/match-titles";
import { PayoutsTable } from "./payouts-table";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZecHub DAO · OpenZcash" };

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/19Zy5hp3dMix8pyP8_PxMF32vkl-OyNWU07jrlCTFfso/edit";

/** Segment palette shared by the donut and the composition bar — site-toned. */
const PALETTE = ["#f59e0b", "#10b981", "#0ea5e9", "#8b5cf6", "#f43f5e"];

function statusTone(status: string): "emerald" | "rose" | "amber" | "zinc" {
  if (status === "executed" || status === "passed") return "emerald";
  if (status === "open") return "amber";
  if (
    status === "rejected" ||
    status === "closed" ||
    status === "execution_failed"
  )
    return "rose";
  return "zinc";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const MONTHS = [
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

/** Formats dates without timezone drift: a date-only string ("2026-07-21")
 * must never render as the previous day in western timezones. */
function fmtDate(iso: string): string {
  if (!iso) return "·";
  const dateOnly = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`;
  }
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "·";
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** USD cents a zat amount is worth at the snapshot's ZEC price. */
function zatToUsdCents(zat: bigint | null, priceCents: bigint | null): bigint {
  if (zat == null || priceCents == null) return 0n;
  return (zat * priceCents) / 100_000_000n;
}

type Segment = { label: string; value: number; color: string };

/**
 * Server-rendered SVG donut (no client JS): each segment is a stroked circle
 * with C=100, advanced clockwise from 12 o'clock via dashoffset.
 */
function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: Segment[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 15.9155; // circumference = 100 for percent-friendly dash math
  // Precompute each arc's start offset immutably: 25 puts the first segment's
  // start at 12 o'clock, and each next one advances clockwise.
  const arcs = segments.map((s, i) => ({
    ...s,
    frac: (s.value / total) * 100,
    offset:
      25 -
      segments.slice(0, i).reduce((acc, x) => acc + (x.value / total) * 100, 0),
  }));
  return (
    // Center text lives in the DOM (not the SVG): text inside a scaled SVG
    // renders soft, while an overlaid HTML label stays crisp at any zoom.
    <div className="relative h-56 w-56 shrink-0">
      <svg viewBox="0 0 42 42" className="h-full w-full" role="img">
        <circle
          cx="21"
          cy="21"
          r={R}
          fill="none"
          stroke="#f5f5f4"
          strokeWidth="5.4"
        />
        {arcs.map((s) => (
          <circle
            key={s.label}
            cx="21"
            cy="21"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="5.4"
            strokeDasharray={`${Math.max(s.frac - 0.6, 0.1)} ${100 - Math.max(s.frac - 0.6, 0.1)}`}
            strokeDashoffset={s.offset}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none tracking-tight text-stone-900 tnum">
          {centerValue}
        </span>
        <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

/** Stacked composition bar with rounded shell — the "divisions" strip. */
function SplitBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3.5 overflow-hidden rounded-full ring-1 ring-inset ring-stone-900/10">
        {segments.map((s) => (
          <div
            key={s.label}
            className="h-full"
            style={{
              width: `${(s.value / total) * 100}%`,
              backgroundColor: s.color,
            }}
            title={`${s.label}: ${((s.value / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-1.5 text-[11px] text-stone-600"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
            <span className="font-semibold text-stone-800 tnum">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TreasuryCard({
  label,
  zat,
  sub,
  accent,
}: {
  label: string;
  zat: bigint;
  sub: string;
  accent: "amber" | "emerald" | "indigo";
}) {
  const orb = {
    amber: "bg-amber-500/15",
    emerald: "bg-emerald-500/15",
    indigo: "bg-indigo-500/15",
  }[accent];
  const tag = {
    amber: "text-amber-700/80",
    emerald: "text-emerald-700/80",
    indigo: "text-indigo-700/80",
  }[accent];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white via-stone-50 to-stone-100/60 p-5 shadow-lg shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full ${orb} blur-3xl`}
      />
      <div className="relative">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wider ${tag}`}
        >
          {label}
        </p>
        <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-3xl">
          {formatZec(zat)}
        </p>
        <p className="mt-2 text-xs text-stone-600 tnum">{sub}</p>
      </div>
    </div>
  );
}

function ProposalRow({
  p,
  funded,
}: {
  p: ZechubProposal;
  funded: TreasuryPayoutRow | null;
}) {
  const total = p.yes + p.no + p.abstain;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start justify-between gap-3 px-5 py-3.5 transition hover:bg-amber-500/[0.06]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded bg-stone-100 px-1.5 py-px font-mono text-[11px] text-stone-500 ring-1 ring-inset ring-stone-200">
            {p.ref}
          </span>
          <span className="truncate text-sm font-medium text-stone-900">
            {p.title}
          </span>
          {funded?.paidUsdCents ? (
            <span
              className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-500/20"
              title={`Treasury dashboard: ${formatUsdCents(funded.paidUsdCents)} paid to date${funded.pendingUsdCents ? `, ${formatUsdCents(funded.pendingUsdCents)} still committed` : ""}`}
            >
              funded · {formatUsdCents(funded.paidUsdCents)} paid
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
          <span>{fmtDate(p.createdAt)}</span>
          {total > 0 ? (
            <span className="tnum">
              <span className="text-emerald-700">{p.yes} yes</span> ·{" "}
              <span className="text-rose-600">{p.no} no</span>
              {p.abstain > 0 ? ` · ${p.abstain} abstain` : ""}
            </span>
          ) : null}
        </div>
      </div>
      <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
    </a>
  );
}

export default async function ZechubDaoPage() {
  const [proposals, snapshot, payouts, series] = await Promise.all([
    getZechubProposals(40),
    latestTreasurySnapshot(),
    treasuryPayouts(),
    treasurySeries(),
  ]);
  const allocations = snapshot ? await treasuryAllocations(snapshot.id) : [];
  const previous = series.length >= 2 ? series[series.length - 2] : null;

  const openCount = proposals.filter((p) => p.status === "open").length;
  const passedCount = proposals.filter(
    (p) => p.status === "passed" || p.status === "executed",
  ).length;

  const totalZat =
    (snapshot?.donationsZat ?? 0n) +
    (snapshot?.fpfZat ?? 0n) +
    (snapshot?.incZat ?? 0n);
  const totalUsdCents =
    (snapshot?.donationsUsdCents ?? 0n) +
    (snapshot?.fpfUsdCents ?? 0n) +
    (snapshot?.incUsdCents ?? 0n);
  const spendableUsdCents = zatToUsdCents(
    snapshot?.fpfUnreservedZat ?? null,
    snapshot?.zecPriceCents ?? null,
  );

  const compositionSegments: Segment[] = snapshot
    ? [
        {
          label: "Donations",
          value: Number(snapshot.donationsZat ?? 0n) / 1e8,
          color: PALETTE[0],
        },
        {
          label: "FPF program fund",
          value: Number(snapshot.fpfZat ?? 0n) / 1e8,
          color: PALETTE[1],
        },
        {
          label: "ZecHub Inc",
          value: Number(snapshot.incZat ?? 0n) / 1e8,
          color: PALETTE[2],
        },
      ]
    : [];

  const allocationSegments: Segment[] = allocations.map((a, i) => ({
    label: a.category,
    value: Number(a.zecZat ?? 0n) / 1e8,
    color: PALETTE[i % PALETTE.length],
  }));
  const allocationTotalZat = allocations.reduce(
    (s, a) => s + (a.zecZat ?? 0n),
    0n,
  );

  const fundedFor = (p: ZechubProposal): TreasuryPayoutRow | null =>
    payouts.find((x) => titlesMatch(x.title, p.title)) ?? null;

  // Rows for the sortable payout table: each grant links to its DAO proposal
  // when the title matches, else to the treasury sheet itself.
  const payoutRows = payouts.map((x) => ({
    id: x.id,
    title: x.title,
    url: proposals.find((p) => titlesMatch(x.title, p.title))?.url ?? SHEET_URL,
    paidUsd: x.paidUsdCents != null ? Number(x.paidUsdCents) / 100 : null,
    pendingUsd:
      x.pendingUsdCents != null ? Number(x.pendingUsdCents) / 100 : null,
    milestones: [x.m1, x.m2, x.m3].filter((m): m is string => m != null),
  }));

  return (
    <>
      <PageHeader
        title="ZecHub DAO"
        subtitle="ZecHub governs itself on-chain (DAO DAO on Juno) and publishes its treasury in a public dashboard. Proposals are live from daodao.zone; treasury numbers mirror the dashboard spreadsheet on the same cycle as the ZCG data."
        actions={
          <div className="flex items-center gap-2">
            <a
              href={SHEET_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-stone-200/70 px-3 py-2 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-200"
            >
              Treasury sheet ↗
            </a>
            <a
              href={`${ZECHUB_DAO_URL}/proposals`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
            >
              daodao.zone ↗
            </a>
          </div>
        }
      />

      {snapshot ? (
        <>
          <section className="relative mb-6 overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-stone-50 to-stone-50 p-6 shadow-lg shadow-stone-300/50 ring-1 ring-inset ring-stone-900/5">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700/80">
                    Total treasury · 3 funds
                  </p>
                  <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-4xl">
                    {formatZec(totalZat)}
                  </p>
                </div>
                <p className="text-lg font-semibold text-stone-700 tnum sm:text-xl">
                  ≈ {formatUsdCents(totalUsdCents)}
                </p>
              </div>
              <div className="mt-5">
                <SplitBar segments={compositionSegments} />
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <TreasuryCard
              label="Donations treasury"
              zat={snapshot.donationsZat ?? 0n}
              sub={formatUsdCents(snapshot.donationsUsdCents ?? 0n)}
              accent="amber"
            />
            <TreasuryCard
              label="FPF program fund"
              zat={snapshot.fpfZat ?? 0n}
              sub={`${formatUsdCents(snapshot.fpfUsdCents ?? 0n)} · ${formatZec(snapshot.fpfUnreservedZat ?? 0n)} spendable`}
              accent="emerald"
            />
            <TreasuryCard
              label="ZecHub Inc"
              zat={snapshot.incZat ?? 0n}
              sub={`${formatUsdCents(snapshot.incUsdCents ?? 0n)}${snapshot.penumbraUm ? ` · ${Math.round(snapshot.penumbraUm)} UM` : ""}${snapshot.namadaNam ? ` · ${Math.round(snapshot.namadaNam).toLocaleString("en-US")} NAM` : ""}`}
              accent="indigo"
            />
          </section>

          <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Stat
              label="Available for new proposals"
              value={formatUsdCents(spendableUsdCents, { compact: true })}
              sub={`after ${formatUsdCents(snapshot.fpfReservedUsdCents ?? 0n, { compact: true })} committed`}
              tone="warn"
            />
            <Stat
              label="Paid out to date"
              value={formatUsdCents(snapshot.totalPaidOutUsdCents ?? 0n, {
                compact: true,
              })}
              sub={`across ${payouts.filter((x) => x.paidUsdCents).length} grants`}
            />
            <Stat
              label="ZEC price used"
              value={formatUsdCents(snapshot.zecPriceCents ?? 0n)}
              sub={`dashboard · ${fmtDate(snapshot.capturedOn)}`}
            />
          </section>

          {allocationSegments.length > 0 ? (
            <section className="mb-8 grid items-stretch gap-6 lg:grid-cols-2">
              <div className="flex flex-col">
                <h2 className="mb-3 text-sm font-semibold text-stone-700">
                  FPF allocation by category
                </h2>
                <Card className="flex flex-1 flex-col justify-center">
                  <div className="flex flex-col items-center gap-6 sm:flex-row">
                    <Donut
                      segments={allocationSegments}
                      centerValue={formatZec(allocationTotalZat, {
                        symbol: false,
                      })}
                      centerLabel="ZEC EARMARKED"
                    />
                    <ul className="w-full space-y-2.5">
                      {allocationSegments.map((s, i) => (
                        <li
                          key={s.label}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="flex min-w-0 items-center gap-2 text-stone-700">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            <span className="truncate">{s.label}</span>
                          </span>
                          <span className="shrink-0 text-stone-800 tnum">
                            <span className="font-semibold">
                              {formatZec(allocations[i]?.zecZat ?? 0n)}
                            </span>
                            {allocations[i]?.sharePct != null ? (
                              <span className="text-stone-500">
                                {" "}
                                · {allocations[i].sharePct}%
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {previous ? (
                    // Balance deltas only: the dashboard's paid-out list
                    // resets per period, so cross-snapshot paid deltas lie.
                    <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500 tnum">
                      Since {fmtDate(previous.capturedOn)}: FPF{" "}
                      {formatZec(
                        (snapshot.fpfZat ?? 0n) - (previous.fpfZat ?? 0n),
                        { sign: true },
                      )}
                      , donations{" "}
                      {formatZec(
                        (snapshot.donationsZat ?? 0n) -
                          (previous.donationsZat ?? 0n),
                        { sign: true },
                      )}
                      .
                    </p>
                  ) : null}
                </Card>
              </div>
              <div className="flex flex-col">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold text-stone-700">
                    Grants: paid vs committed
                  </h2>
                  <a
                    href="/api/feeds/zechub.xml"
                    className="text-xs text-stone-400 hover:text-amber-700"
                    title="Subscribe to new ZecHub treasury payouts via RSS"
                  >
                    RSS ↗
                  </a>
                </div>
                <Card className="flex-1 overflow-hidden">
                  <PayoutsTable rows={payoutRows} />
                </Card>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="Recent proposals"
          value={String(proposals.length)}
          sub="newest first"
        />
        <Stat
          label="Open now"
          value={String(openCount)}
          sub="voting in progress"
          tone="warn"
        />
        <Stat
          label="Passed / executed"
          value={String(passedCount)}
          sub="of those shown"
        />
      </section>

      {proposals.length > 0 ? (
        <Card className="p-0">
          <p className="border-b border-stone-200 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-stone-600">
            Latest proposals
          </p>
          <div className="divide-y divide-stone-200">
            {proposals.map((p) => (
              <ProposalRow key={p.id} p={p} funded={fundedFor(p)} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-stone-600">
            Proposals are temporarily unavailable — the DAO DAO indexer did not
            respond. Try again shortly, or open{" "}
            <a
              href={`${ZECHUB_DAO_URL}/proposals`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-700 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-800"
            >
              the DAO on daodao.zone ↗
            </a>
            .
          </p>
        </Card>
      )}

      <p className="mt-4 text-xs text-stone-500">
        Treasury figures mirror the{" "}
        <a
          href={SHEET_URL}
          target="_blank"
          rel="noreferrer"
          className="text-amber-700 hover:underline"
        >
          ZecHub DAO Treasury Dashboard ↗
        </a>{" "}
        maintained by the DAO
        {snapshot
          ? ` (last dashboard update ${fmtDate(snapshot.capturedOn)})`
          : ""}
        , re-imported every 6 hours. Proposals are read live from the DAO DAO
        indexer. The{" "}
        <span className="rounded bg-emerald-500/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          funded
        </span>{" "}
        chip links a proposal to its payout line by title match.
      </p>
    </>
  );
}
