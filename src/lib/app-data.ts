/**
 * Carregamento dos dados de auditoria para as páginas (server-side).
 *
 * Fonte de verdade agora é o Postgres. Na primeira carga (banco vazio) faz um
 * scan inicial a partir do gateway configurado (mock por padrão) para popular.
 */

import { reconcile } from "@/lib/accounting/reconciliation";
import { loadOverrides } from "@/lib/accounting/overrides-repo";
import { loadDerivedAddressIndex } from "@/lib/projects/project-repo";
import { countChainTxs, loadAuditFromDb } from "@/lib/repos/audit-repo";
import { getTransparentGateway, getZcashGateway } from "@/lib/zcash/provider";
import { runScan } from "@/lib/zcash/scan/scanner";

export async function loadAudit() {
  const gateway = getZcashGateway();
  if ((await countChainTxs()) === 0) {
    await runScan(gateway);
    // Fontes transparentes (endereços públicos via lwd) — escaneadas além do shielded.
    const transparent = await getTransparentGateway();
    if (transparent) await runScan(transparent);
  }

  const snapshot = await loadAuditFromDb();
  const treasuryLabels = new Map(
    snapshot.viewingKeys.map((v) => [v.id, v.accountLabel]),
  );
  const [overrides, derivedAddrs] = await Promise.all([
    loadOverrides(),
    loadDerivedAddressIndex(),
  ]);
  const recon = reconcile(
    snapshot.txs,
    snapshot.paychecks,
    treasuryLabels,
    overrides,
    derivedAddrs,
  );

  // Saldo REAL = soma dos saldos on-chain persistidos de TODOS os tesouros
  // (shielded via engine + transparente via lwd). Corrige a distorção cross-pool.
  const realBalanceZat = snapshot.viewingKeys.some(
    (v) => v.balanceZat !== undefined,
  )
    ? snapshot.viewingKeys.reduce((s, v) => s + (v.balanceZat ?? 0n), 0n)
    : null;

  return { ...snapshot, recon, realBalanceZat };
}

export type AuditData = Awaited<ReturnType<typeof loadAudit>>;
