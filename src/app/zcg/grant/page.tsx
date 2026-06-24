import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { grantMilestones } from "@/lib/zcg/grants-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grant detail · ZBO" };

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  cancelled: "Cancelled",
  open: "Open",
  keyholder_veto: "Veto",
  funds_returned: "Returned",
};

export default async function GrantDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string }>;
}) {
  const { g } = await searchParams;
  if (!g) notFound();
  const milestones = await grantMilestones(g);
  if (milestones.length === 0) notFound();

  const head = milestones[0];
  const totalUsd = milestones.reduce(
    (s, m) => s + (m.amountUsdCents ?? 0n),
    0n,
  );
  const paid = milestones.filter((m) => m.isPaid);
  const open = milestones.filter((m) => !m.isPaid);
  const paidUsd = paid.reduce((s, m) => s + (m.amountUsdCents ?? 0n), 0n);
  const openUsd = open.reduce((s, m) => s + (m.amountUsdCents ?? 0n), 0n);

  return (
    <>
      <Link
        href="/zcg/grants"
        className="mb-4 inline-block text-xs text-stone-500 hover:text-stone-800"
      >
        ‹ All grants
      </Link>

      <PageHeader
        title={g}
        subtitle={`${head.recipientNameRaw}${head.category ? ` · ${head.category}` : ""} · ${paid.length} of ${milestones.length} milestones paid`}
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Grant value"
          value={formatUsdCents(totalUsd, { compact: true })}
          sub="sum of milestones"
        />
        <Stat
          label="Paid"
          value={formatUsdCents(paidUsd, { compact: true })}
          sub={`${paid.length} milestones`}
        />
        <Stat
          label="Open"
          value={formatUsdCents(openUsd, { compact: true })}
          sub={`${open.length} milestones`}
        />
        <Stat
          label="Status"
          value={
            STATUS_LABEL[head.grantStatus ?? ""] ?? head.grantStatus ?? "·"
          }
          sub="grant level"
          tone={head.grantStatus === "completed" ? "in" : "warn"}
        />
      </section>

      {open.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
            Open milestones
            <Badge tone="amber">{open.length}</Badge>
          </h2>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-stone-500">
                <tr className="border-b border-stone-200">
                  <th className="px-4 py-3 font-medium">Milestone</th>
                  <th className="px-4 py-3 font-medium">Deliverable</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Budgeted USD
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    Estimated date
                  </th>
                </tr>
              </thead>
              <tbody>
                {open.map((m) => (
                  <tr
                    key={m.id}
                    className="tbl-row border-b border-stone-200 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-stone-900">
                      {m.milestoneLabel ?? "·"}
                    </td>
                    <td className="max-w-[20rem] px-4 py-2.5 text-stone-500">
                      <span className="block truncate">
                        {m.deliverable ?? m.project ?? "·"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                      {formatUsdCents(m.amountUsdCents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-stone-500 tnum">
                      {(m.estimatedPayoutDate ?? m.paidOutRaw) || "TBD"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
          Paid milestones
          <Badge tone="emerald">{paid.length}</Badge>
        </h2>
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-stone-500">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 font-medium">Milestone</th>
                <th className="px-4 py-3 text-right font-medium">USD</th>
                <th className="px-4 py-3 text-right font-medium">ZEC</th>
                <th className="px-4 py-3 text-right font-medium">ZEC/USD</th>
                <th className="px-4 py-3 text-right font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {paid.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-stone-400"
                  >
                    No milestones paid yet.
                  </td>
                </tr>
              ) : null}
              {paid.map((m) => (
                <tr
                  key={m.id}
                  className="tbl-row border-b border-stone-200 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium text-stone-900">
                    {m.milestoneLabel ?? "·"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                    {formatUsdCents(m.amountUsdCents)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                    {m.zecDisbursedZat != null
                      ? formatZec(m.zecDisbursedZat, { symbol: false })
                      : "·"}
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-500 tnum">
                    {m.usdDisbursedZecRateCents != null
                      ? formatUsdCents(m.usdDisbursedZecRateCents)
                      : "·"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-stone-500 tnum">
                    {m.paidOutDate ?? "·"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </>
  );
}
