import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import { IconShield } from "@/components/icons";
import { zcgReconciliation } from "@/lib/zcg/reconcile-onchain";
import { formatUsdCents } from "@/lib/zcg/format";
import { formatZec } from "@/lib/zcash/units";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reconciliation ZCG · ZBO" };

export default async function ZcgReconciliacaoPage() {
  const r = await zcgReconciliation();

  return (
    <>
      <PageHeader
        title="Reconciliation · on-chain"
        subtitle="Cross-check between ZCG's on-chain treasury flow and what the spreadsheet records as distributed. Individual grantee payments leave the shielded pool · only the aggregate flow is visible on-chain."
      />

      {r.onchain ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-stone-700">
            Treasury flow · {r.onchain.treasuryLabel} (on-chain)
          </h2>
          <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat
              label="In · from Lockbox"
              value={formatZec(r.onchain.inflowZat, { symbol: false })}
              sub="received on-chain"
              tone="in"
            />
            <Stat
              label="Out · to shielded pool"
              value={formatZec(r.onchain.outflowZat, { symbol: false })}
              sub="moved to payments"
              tone="out"
            />
            <Stat
              label="Current balance"
              value={formatZec(r.onchain.balanceZat, { symbol: false })}
              sub="held in treasury"
            />
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-stone-700">
              Balance check:{" "}
              <span className="tnum text-stone-500">
                {formatZec(r.onchain.inflowZat, { symbol: false })} −{" "}
                {formatZec(r.onchain.outflowZat, { symbol: false })} ={" "}
                {formatZec(r.onchain.balanceZat)}
              </span>
            </div>
            {r.onchain.reconciles ? (
              <Badge tone="emerald">in − out = balance</Badge>
            ) : (
              <Badge tone="amber">
                residual {formatZec(r.onchain.residualZat)}
              </Badge>
            )}
          </Card>

          {r.onchain.outputs.length > 0 ? (
            <Card className="mt-3 p-0">
              <p className="border-b border-stone-200 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-stone-500">
                Transparent outputs detected
              </p>
              <div className="divide-y divide-stone-200">
                {r.onchain.outputs.map((o) => (
                  <div
                    key={o.txid}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <span className="text-stone-500 tnum">{o.date ?? "·"}</span>
                    <span className="flex items-center gap-2 text-stone-700">
                      <IconShield className="h-3.5 w-3.5 text-amber-700/70" />
                      sent to the shielded pool
                    </span>
                    <span className="font-medium text-rose-600 tnum">
                      {formatZec(o.zecZat, { symbol: false })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Distribution per the spreadsheet (historical cumulative)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="ZEC paid to grantees"
            value={formatZec(r.sheet.zecPaidZat, { symbol: false })}
            sub={`${r.sheet.zecPaymentCount} ZEC payments`}
            tone="warn"
          />
          <Stat
            label="USD paid"
            value={formatUsdCents(r.sheet.usdPaidCents, { compact: true })}
            sub="budgeted value of paid items"
          />
          <Stat
            label="Payments"
            value={String(r.sheet.paidCount)}
            sub={`${r.sheet.offchainCount} in USD/USDC (off-chain)`}
          />
        </div>
      </section>

      <Card className="flex items-start gap-3 border-amber-500/20 bg-amber-500/[0.06]">
        <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-amber-700/70" />
        <div className="text-sm text-amber-800/80">
          <p className="font-medium text-amber-800">
            Why there is no 1:1 match per payment
          </p>
          <p className="mt-1 text-amber-800/70">
            The ZCG transparent treasury only reveals the aggregate flow: it
            receives from the Lockbox and moves blocks of ZEC into the shielded
            pool. The {r.sheet.zecPaymentCount} individual grantee payments
            leave the Orchard (shielded) pool or historical addresses · private
            by design. Auditing each per-grantee payment would require the{" "}
            <strong>ZCG shielded UFVK</strong>. The reconciliation possible
            today is the <strong>treasury flow</strong> (above) plus the
            spreadsheet <strong>integrity-check</strong>.
          </p>
        </div>
      </Card>
    </>
  );
}
