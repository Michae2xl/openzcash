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
        title="Reconciliação on-chain"
        subtitle="Cruzamento entre o fluxo do tesouro ZCG na cadeia e o que a planilha registra como distribuído. Os pagamentos individuais aos grantees saem do pool blindado — só o fluxo agregado é visível na cadeia."
      />

      {r.onchain ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-stone-700">
            Fluxo do tesouro {r.onchain.treasuryLabel} (on-chain)
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
              <Badge tone="emerald">✓ in − out = balance</Badge>
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
                    <span className="text-stone-500 tnum">{o.date ?? "—"}</span>
                    <span className="flex items-center gap-2 text-stone-700">
                      <IconShield className="h-3.5 w-3.5 text-amber-700/70" />
                      enviado ao pool blindado
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
          Distribuição segundo a planilha (acumulado histórico)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="ZEC pago a grantees"
            value={formatZec(r.sheet.zecPaidZat, { symbol: false })}
            sub={`${r.sheet.zecPaymentCount} pagamentos em ZEC`}
            tone="warn"
          />
          <Stat
            label="USD pago"
            value={formatUsdCents(r.sheet.usdPaidCents, { compact: true })}
            sub="valor orçado dos pagos"
          />
          <Stat
            label="Pagamentos"
            value={String(r.sheet.paidCount)}
            sub={`${r.sheet.offchainCount} em USD/USDC (off-chain)`}
          />
        </div>
      </section>

      <Card className="flex items-start gap-3 border-sky-500/20 bg-sky-500/[0.06]">
        <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div className="text-sm text-sky-800/80">
          <p className="font-medium text-sky-800">
            Por que não há casamento 1:1 por pagamento
          </p>
          <p className="mt-1 text-sky-800/70">
            O tesouro transparente do ZCG só revela o fluxo agregado: ele recebe
            do Lockbox e move blocos de ZEC para o pool blindado. Os{" "}
            {r.sheet.zecPaymentCount} pagamentos individuais aos grantees saem
            do pool Orchard (blindado) ou de endereços históricos — privados por
            design. Para auditar cada pagamento por-grantee, seria necessária a{" "}
            <strong>UFVK shielded do ZCG</strong>. A reconciliação possível hoje
            é a de <strong>fluxo do tesouro</strong> (acima) e o{" "}
            <strong>integrity-check</strong> da planilha.
          </p>
        </div>
      </Card>
    </>
  );
}
