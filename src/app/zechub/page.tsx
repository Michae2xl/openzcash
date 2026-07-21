import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { BarList } from "@/components/bar-list";
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
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec, formatZecCompact } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZecHub DAO · OpenZcash" };

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/19Zy5hp3dMix8pyP8_PxMF32vkl-OyNWU07jrlCTFfso/edit";

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

function MilestoneDots({ p }: { p: TreasuryPayoutRow }) {
  const dots = [p.m1, p.m2, p.m3].filter((m) => m != null);
  if (!dots.length) return <span className="text-stone-300">·</span>;
  return (
    <span className="flex items-center gap-1" title="Milestones M1 · M2 · M3">
      {dots.map((m, i) => (
        <span
          key={i}
          className={
            /complete/i.test(m ?? "")
              ? "h-2 w-2 rounded-full bg-emerald-500"
              : "h-2 w-2 rounded-full bg-stone-200 ring-1 ring-inset ring-stone-300"
          }
          title={`M${i + 1}: ${m || "pending"}`}
        />
      ))}
    </span>
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

  const maxAlloc = allocations.reduce(
    (m, a) => (a.zecZat != null && a.zecZat > m ? a.zecZat : m),
    0n,
  );
  const allocBars = allocations.map((a) => ({
    label: a.category,
    value: maxAlloc > 0n ? Number(((a.zecZat ?? 0n) * 1000n) / maxAlloc) : 0,
    display: `${formatZec(a.zecZat ?? 0n)}${a.sharePct != null ? ` · ${a.sharePct}%` : ""}`,
  }));

  const fundedFor = (p: ZechubProposal): TreasuryPayoutRow | null =>
    payouts.find((x) => titlesMatch(x.title, p.title)) ?? null;

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
          <section className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-500/[0.07] via-stone-50 to-stone-50 p-5 shadow-lg shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-700/70">
                Donations treasury
              </p>
              <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-3xl">
                {formatZec(snapshot.donationsZat ?? 0n)}
              </p>
              <p className="mt-2 text-xs text-stone-600 tnum">
                {formatUsdCents(snapshot.donationsUsdCents ?? 0n)}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
                FPF program fund
              </p>
              <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-3xl">
                {formatZec(snapshot.fpfZat ?? 0n)}
              </p>
              <p className="mt-2 text-xs text-stone-600 tnum">
                {formatUsdCents(snapshot.fpfUsdCents ?? 0n)} ·{" "}
                {formatZec(snapshot.fpfUnreservedZat ?? 0n)} spendable
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 p-5 shadow-sm shadow-stone-300/40 ring-1 ring-inset ring-stone-900/5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
                ZecHub Inc
              </p>
              <p className="mt-1.5 text-2xl font-bold leading-none tracking-tight text-stone-900 tnum sm:text-3xl">
                {formatZec(snapshot.incZat ?? 0n)}
              </p>
              <p className="mt-2 text-xs text-stone-600 tnum">
                {formatUsdCents(snapshot.incUsdCents ?? 0n)}
                {snapshot.penumbraUm
                  ? ` · ${Math.round(snapshot.penumbraUm)} UM`
                  : ""}
                {snapshot.namadaNam
                  ? ` · ${Math.round(snapshot.namadaNam).toLocaleString("en-US")} NAM`
                  : ""}
              </p>
            </div>
          </section>

          <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Total treasury"
              value={formatZecCompact(totalZat)}
              sub={formatUsdCents(totalUsdCents, { compact: true })}
            />
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

          {allocBars.length > 0 ? (
            <section className="mb-8 grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-stone-700">
                  FPF allocation by category
                </h2>
                <Card>
                  <BarList items={allocBars} />
                  {previous ? (
                    // Balance deltas only: the dashboard's paid-out list
                    // resets per period, so cross-snapshot paid deltas lie.
                    <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-500 tnum">
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
              <div>
                <h2 className="mb-3 text-sm font-semibold text-stone-700">
                  Grants: paid vs committed
                </h2>
                <Card className="p-0">
                  <div className="max-h-[19rem] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white text-left text-[11px] uppercase tracking-wider text-stone-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Grant</th>
                          <th className="px-4 py-2 text-right font-medium">
                            Paid
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            Committed
                          </th>
                          <th className="px-4 py-2 text-right font-medium">
                            M1·M2·M3
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {payouts.map((x) => (
                          <tr key={x.id}>
                            <td className="max-w-[16rem] truncate px-4 py-2 text-stone-800">
                              {x.title}
                            </td>
                            <td className="px-4 py-2 text-right text-stone-700 tnum">
                              {x.paidUsdCents
                                ? formatUsdCents(x.paidUsdCents)
                                : "·"}
                            </td>
                            <td className="px-4 py-2 text-right text-amber-700/90 tnum">
                              {x.pendingUsdCents
                                ? formatUsdCents(x.pendingUsdCents)
                                : "·"}
                            </td>
                            <td className="px-4 py-2">
                              <span className="flex justify-end">
                                <MilestoneDots p={x} />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
