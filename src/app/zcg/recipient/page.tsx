import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { recipientMilestones } from "@/lib/zcg/grants-repo";
import { normalizeKey } from "@/lib/zcg/normalize";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recipient milestones · OpenZcash" };

export default async function RecipientPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const { r } = await searchParams;
  if (!r) notFound();

  const rows = await recipientMilestones(normalizeKey(r));
  if (rows.length === 0) notFound();

  const name = rows.find((m) => m.recipientNameRaw)?.recipientNameRaw ?? r;
  const open = rows.filter((m) => !m.isPaid);
  const paid = rows.filter((m) => m.isPaid);
  const sum = (xs: typeof rows) =>
    xs.reduce((s, m) => s + (m.amountUsdCents ?? 0n), 0n);

  return (
    <>
      <Link
        href="/zcg/totals"
        className="mb-4 inline-block text-xs text-stone-500 hover:text-stone-800"
      >
        ‹ Totals
      </Link>

      <PageHeader
        title={name}
        subtitle={`${open.length} upcoming and ${paid.length} paid milestones in the grants ledger. Future amounts and dates are the open milestones recorded for this recipient.`}
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Future milestones"
          value={formatUsdCents(sum(open), { compact: true })}
          sub={`${open.length} open`}
        />
        <Stat
          label="Paid to date"
          value={formatUsdCents(sum(paid), { compact: true })}
          sub={`${paid.length} milestones`}
        />
      </section>

      {open.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
            Upcoming milestones
            <Badge tone="amber">{open.length}</Badge>
          </h2>
          <Card className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-stone-600">
                <tr className="border-b border-stone-200">
                  <th className="px-4 py-3 font-medium">Grant</th>
                  <th className="px-4 py-3 font-medium">Milestone</th>
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
                    <td className="max-w-[18rem] px-4 py-2.5 font-medium text-stone-900">
                      {m.project ? (
                        <Link
                          href={`/zcg/grant?g=${encodeURIComponent(m.project)}`}
                          className="block truncate hover:text-amber-700"
                        >
                          {m.project}
                        </Link>
                      ) : (
                        "·"
                      )}
                    </td>
                    <td className="max-w-[16rem] px-4 py-2.5 text-stone-600">
                      <span className="block truncate">
                        {m.deliverable ?? m.milestoneLabel ?? "·"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                      {formatUsdCents(m.amountUsdCents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-stone-600 tnum">
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
            <thead className="text-[11px] uppercase tracking-wider text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3 font-medium">Grant</th>
                <th className="px-4 py-3 text-right font-medium">USD</th>
                <th className="px-4 py-3 text-right font-medium">ZEC</th>
                <th className="px-4 py-3 text-right font-medium">Paid on</th>
              </tr>
            </thead>
            <tbody>
              {paid.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-stone-500"
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
                  <td className="max-w-[18rem] px-4 py-2.5 font-medium text-stone-900">
                    {m.project ? (
                      <Link
                        href={`/zcg/grant?g=${encodeURIComponent(m.project)}`}
                        className="block truncate hover:text-amber-700"
                      >
                        {m.project}
                      </Link>
                    ) : (
                      "·"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                    {formatUsdCents(m.amountUsdCents)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                    {m.zecDisbursedZat != null
                      ? formatZec(m.zecDisbursedZat, { symbol: false })
                      : "·"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-xs text-stone-600 tnum">
                    {m.paidOutDate ?? m.paidOutRaw ?? "·"}
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
