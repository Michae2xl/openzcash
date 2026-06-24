import { Card, PageHeader, Stat } from "@/components/ui";
import { mayaTransfers } from "@/lib/zcg/snapshots-repo";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "Maya Liquidity · ZBO" };

export default async function MayaPage() {
  const transfers = await mayaTransfers();
  const totalZec = transfers.reduce(
    (s, t) => s + (t.zecTransferredZat ?? 0n),
    0n,
  );
  const totalUsd = transfers.reduce((s, t) => s + (t.amountUsdCents ?? 0n), 0n);

  return (
    <>
      <PageHeader
        title="Maya Liquidity"
        subtitle="The ZCG LP position on Maya/THORChain: ZEC contributions for ecosystem liquidity. CACAO is tracked in its own unit (never added to ZEC)."
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="ZEC contributed"
          value={formatZec(totalZec, { symbol: false })}
          sub="to the Maya LP"
        />
        <Stat
          label="Cost in USD"
          value={formatUsdCents(totalUsd, { compact: true })}
          sub="at the contribution date"
        />
        <Stat
          label="Contributions"
          value={String(transfers.length)}
          sub="transfers"
        />
      </section>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="tbl-head text-[11px] uppercase tracking-wider text-stone-500">
            <tr className="border-b border-stone-200">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 text-right font-medium">USD</th>
              <th className="px-4 py-3 text-right font-medium">ZEC</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-stone-400"
                >
                  No Maya liquidity contributions recorded yet.
                </td>
              </tr>
            ) : null}
            {transfers.map((t) => (
              <tr
                key={t.id}
                className="tbl-row border-b border-stone-200 last:border-0"
              >
                <td className="px-4 py-2.5 font-medium text-stone-900">
                  {t.project ?? "·"}
                </td>
                <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                  {formatUsdCents(t.amountUsdCents)}
                </td>
                <td className="px-4 py-2.5 text-right text-stone-700 tnum">
                  {t.zecTransferredZat != null
                    ? formatZec(t.zecTransferredZat, { symbol: false })
                    : "·"}
                </td>
                <td className="hidden px-4 py-2.5 text-right text-xs text-stone-500 sm:table-cell tnum">
                  {t.transferredAt ?? "·"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
