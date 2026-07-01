import Link from "next/link";
import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { Synced } from "@/components/synced";
import { formatUsdCents } from "@/lib/zcg/format";
import { cached, LEDGER_TTL_MS } from "@/lib/cache/memo";
import { listProposals } from "@/lib/zcg/proposals-repo";
import { listGrants } from "@/lib/zcg/grants-repo";
import { conversionAnalysis } from "@/lib/zcg/conversion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proposal → grant · OpenZcash" };

export default async function ConversionPage() {
  const [approved, grants] = await Promise.all([
    cached("conv:approved", LEDGER_TTL_MS, () =>
      listProposals({ status: "approved" }),
    ),
    cached("conv:grants", LEDGER_TTL_MS, () => listGrants({})),
  ]);

  const result = conversionAnalysis(
    approved.map((p) => ({
      title: p.title,
      requestedUsdCents: p.requestedUsdCents ?? null,
      decisionDate: p.decisionDate ?? null,
    })),
    grants.map((g) => ({
      grantKey: g.grantKey,
      usdCents: g.usdCents,
      firstPaid: g.firstPaid,
      status: g.status,
    })),
  );

  const matched = result.pairs.filter((p) => p.grantKey != null);
  const unmatched = result.pairs.filter((p) => p.grantKey == null);
  const rate = result.approvedCount
    ? Math.round((result.matchedCount / result.approvedCount) * 100)
    : 0;

  const lags = matched
    .map((p) => p.lagDays)
    .filter((d): d is number => d != null && d >= 0);
  const avgLag = lags.length
    ? Math.round(lags.reduce((s, d) => s + d, 0) / lags.length)
    : null;

  const requestedTotal = matched.reduce(
    (s, p) => s + Number(p.requestedUsdCents ?? 0n),
    0,
  );
  const disbursedTotal = matched.reduce(
    (s, p) => s + Number(p.disbursedUsdCents ?? 0n),
    0,
  );

  return (
    <>
      <PageHeader
        title="Proposal → grant"
        subtitle="How much of what the committee approved actually became a funded, paid grant — and where the trail goes cold between governance and payment."
        actions={
          <Link
            href="/zcg/proposals"
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            ‹ Proposals
          </Link>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Approved"
          value={String(result.approvedCount)}
          sub="proposals to fund"
        />
        <Stat
          label="Became grants"
          value={`${rate}%`}
          sub={`${result.matchedCount} matched to the ledger`}
          tone="warn"
        />
        <Stat
          label="Approval → 1st payment"
          value={avgLag != null ? `${avgLag}d` : "n/a"}
          sub="average lag"
        />
        <Stat
          label="Requested vs paid"
          value={
            requestedTotal > 0
              ? `${Math.round((disbursedTotal / requestedTotal) * 100)}%`
              : "n/a"
          }
          sub="disbursed of requested"
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Funded — approved proposals matched to a grant
        </h2>
        <Card className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-left text-xs text-stone-500">
                <th className="px-4 py-2.5 font-medium">Proposal → grant</th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Requested
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  Disbursed
                </th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Lag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {matched.map((p) => (
                <tr key={p.title} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/zcg/grant?g=${encodeURIComponent(p.grantKey ?? "")}`}
                      className="block max-w-[26rem] truncate font-medium text-stone-800 hover:text-amber-700"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-stone-600 tnum">
                    {p.requestedUsdCents != null
                      ? formatUsdCents(Number(p.requestedUsdCents), {
                          compact: true,
                        })
                      : "·"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-amber-700/90 tnum">
                    {formatUsdCents(Number(p.disbursedUsdCents ?? 0n), {
                      compact: true,
                    })}
                  </td>
                  <td className="hidden px-4 py-2.5 text-right text-xs text-stone-500 tnum sm:table-cell">
                    {p.lagDays != null ? `${p.lagDays}d` : "·"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {unmatched.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-700">
              Approved, but no grant found
            </h2>
            <Badge tone="amber">{unmatched.length}</Badge>
          </div>
          <Card className="p-0">
            <div className="divide-y divide-stone-100">
              {unmatched.map((p) => (
                <div
                  key={p.title}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-stone-700">
                    {p.title}
                  </span>
                  <span className="shrink-0 text-xs text-stone-500 tnum">
                    {p.requestedUsdCents != null
                      ? formatUsdCents(Number(p.requestedUsdCents), {
                          compact: true,
                        })
                      : "·"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            These approved proposals have no matching grant in the ledger. That
            can mean a genuinely unfunded approval, a title that drifted between
            the funnel and the ledger (the join is by title, not a shared id),
            or simple import lag — see{" "}
            <Link
              href="/zcg/methodology"
              className="text-amber-700 hover:underline"
            >
              how we compute this
            </Link>
            .
          </p>
        </section>
      ) : null}

      <Synced />
    </>
  );
}
