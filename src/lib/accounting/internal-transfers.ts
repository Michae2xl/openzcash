/**
 * Detecção de TRANSFERÊNCIAS INTERNAS entre tesouros do mesmo dono.
 *
 * Estratégia "twin-match cross-tesouro": uma transferência interna aparece como a
 * MESMA txid vista por dois tesouros — uma perna de SAÍDA (output direction "out",
 * decifrada via OVK no remetente) e uma perna de ENTRADA (note direction "in",
 * decifrada via IVK no destinatário) com (pool, address, valueZat) IDÊNTICOS.
 *
 * Por que o par exato (e não "endereço ∈ conjunto" nem "txid compartilhada"):
 *  - Em Sapling/Orchard o address do output (OVK) é byte-a-byte igual ao address da
 *    note (IVK): mesmo (diversifier, pk_d). Logo igualdade de string == igualdade
 *    criptográfica POR POOL — por isso a chave inclui o pool.
 *  - Exigir a perna IN na MESMA txid em OUTRO tesouro mata os falsos-positivos: um
 *    terceiro pagando dois tesouros nossos na mesma tx não tem OUT nosso; um
 *    pagamento externo a um endereço que por acaso já recebemos não tem a perna IN.
 *
 * Granularidade por OUTPUT: o índice guarda o VALOR interno CASADO por leg
 * (`internalOutValueByLeg`/`internalInValueByLeg`), não a transação inteira — assim
 * uma tx MISTA (uma perna interna + uma externa no mesmo txid, comum no Zcash) tem
 * só a parte casada contabilizada como interna; o resto segue externo.
 *
 * Função pura/imutável e offline (não consulta a engine). Casos sem par fechado
 * viram `internal_out_unconfirmed` (exceção p/ revisão), nunca silenciados.
 */

import type { ChainTx } from "../zcash/types";

export type InternalLegClass =
  | "internal_out"
  | "internal_in"
  | "internal_out_unconfirmed";

export interface InternalIndex {
  /** legKey(treasuryId, txid) → classe da perna interna. */
  readonly classByLeg: ReadonlyMap<string, InternalLegClass>;
  /** legKey(treasuryId, txid) → treasuryId do tesouro par. */
  readonly peerTreasury: ReadonlyMap<string, string>;
  /** legKey → valor ENVIADO internamente nesta tx (só os outputs casados). */
  readonly internalOutValueByLeg: ReadonlyMap<string, bigint>;
  /** legKey → valor RECEBIDO internamente nesta tx (só as notes casadas). */
  readonly internalInValueByLeg: ReadonlyMap<string, bigint>;
}

export function legKey(
  treasuryId: string | null | undefined,
  txid: string,
): string {
  return `${treasuryId ?? ""}::${txid}`;
}

const addrKey = (pool: string, address: string): string => `${pool}:${address}`;

interface InLeg {
  readonly treasuryId: string;
  readonly txid: string;
  readonly index: number;
  readonly pool: string;
  readonly address: string;
  readonly valueZat: bigint;
}

/** Identidade ESTÁVEL de uma perna IN: txid + index do output (matching 1:1 real,
 * sem colidir entre txids distintos que reusem o mesmo addr/valor). */
const twinId = (n: InLeg): string => `${n.txid}:${n.index}`;

const add = (m: Map<string, bigint>, k: string, v: bigint): void => {
  m.set(k, (m.get(k) ?? 0n) + v);
};

export function buildInternalIndex(txs: readonly ChainTx[]): InternalIndex {
  // 1) Endereços de recebimento próprios — SOMENTE "in" (troco "change" é interno
  //    do próprio tesouro e nunca é destino de OUT de outra conta).
  const ownReceiptTreasuries = new Map<string, Set<string>>();
  // Pernas IN indexadas por txid — par achado na MESMA tx mesmo sem histórico.
  const inLegsByTxid = new Map<string, InLeg[]>();
  // Endereços que receberam OUT nosso (por txid) — base da guarda transparente.
  const txidsWithOwnOutByAddr = new Map<string, Set<string>>();

  for (const tx of txs) {
    const t = tx.treasuryId ?? "";
    for (const o of tx.outputs) {
      if (o.direction === "in" && o.address) {
        const k = addrKey(o.pool, o.address);
        (
          ownReceiptTreasuries.get(k) ??
          ownReceiptTreasuries.set(k, new Set()).get(k)!
        ).add(t);
        (
          inLegsByTxid.get(tx.txid) ??
          inLegsByTxid.set(tx.txid, []).get(tx.txid)!
        ).push({
          treasuryId: t,
          txid: tx.txid,
          index: o.index,
          pool: o.pool,
          address: o.address,
          valueZat: o.valueZat,
        });
      } else if (o.direction === "out" && o.address) {
        const k = addrKey(o.pool, o.address);
        (
          txidsWithOwnOutByAddr.get(k) ??
          txidsWithOwnOutByAddr.set(k, new Set()).get(k)!
        ).add(tx.txid);
      }
    }
  }

  // Guarda transparente: endereço (transparente, reusável/público) que aparece como
  // IN numa txid SEM OUT nosso para ele recebeu de fora — não pode ser silenciado.
  const externallyReceived = new Set<string>();
  for (const tx of txs) {
    for (const o of tx.outputs) {
      if (o.direction === "in" && o.address) {
        const k = addrKey(o.pool, o.address);
        const outTxids = txidsWithOwnOutByAddr.get(k);
        if (!outTxids || !outTxids.has(tx.txid)) externallyReceived.add(k);
      }
    }
  }

  const classByLeg = new Map<string, InternalLegClass>();
  const peerTreasury = new Map<string, string>();
  const internalOutValueByLeg = new Map<string, bigint>();
  const internalInValueByLeg = new Map<string, bigint>();
  const usedTwins = new Set<string>();

  // Passada 1 — pares CONFIRMADOS por OUTPUT (mesma txid, tesouro distinto,
  // pool+addr+value idênticos). Cada output casa com no máximo uma note (1:1).
  for (const tx of txs) {
    const from = tx.treasuryId ?? "";
    for (const o of tx.outputs) {
      if (o.direction !== "out" || !o.address) continue;
      const k = addrKey(o.pool, o.address);
      if (!ownReceiptTreasuries.has(k)) continue; // destino externo
      // t-addr reusado que também recebeu de fora: não confirma (revisão humana).
      if (o.pool === "transparent" && externallyReceived.has(k)) continue;
      const twin = (inLegsByTxid.get(tx.txid) ?? []).find(
        (n) =>
          n.treasuryId !== from &&
          n.pool === o.pool &&
          n.address === o.address &&
          n.valueZat === o.valueZat &&
          !usedTwins.has(twinId(n)),
      );
      if (!twin) continue;
      usedTwins.add(twinId(twin));
      const legOut = legKey(from, tx.txid);
      const legIn = legKey(twin.treasuryId, tx.txid);
      classByLeg.set(legOut, "internal_out");
      classByLeg.set(legIn, "internal_in");
      peerTreasury.set(legOut, twin.treasuryId);
      peerTreasury.set(legIn, from);
      add(internalOutValueByLeg, legOut, o.valueZat);
      add(internalInValueByLeg, legIn, twin.valueZat);
    }
  }

  // Passada 2 — destino é endereço de OUTRO tesouro nosso, mas sem par fechado
  // (perna IN não observada, ou t-addr reusado) → exceção. NÃO registra valor
  // interno: o valor segue contado como saída EXTERNA provisória até confirmar.
  for (const tx of txs) {
    const from = tx.treasuryId ?? "";
    for (const o of tx.outputs) {
      if (o.direction !== "out" || !o.address) continue;
      const k = addrKey(o.pool, o.address);
      const owners = ownReceiptTreasuries.get(k);
      if (!owners) continue; // destino externo
      const lk = legKey(from, tx.txid);
      if (classByLeg.has(lk)) continue; // já classificada — não rebaixar
      const other = [...owners].find((x) => x !== from);
      if (other === undefined) continue; // owners == {from}: self-send/troco
      classByLeg.set(lk, "internal_out_unconfirmed");
      peerTreasury.set(lk, other);
    }
  }

  return {
    classByLeg,
    peerTreasury,
    internalOutValueByLeg,
    internalInValueByLeg,
  };
}
