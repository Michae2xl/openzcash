/**
 * Gateway de auditoria de TESOUROS TRANSPARENTES (endereços t1/t3) via lightwalletd.
 *
 * Endereço transparente é PÚBLICO — toda entrada/saída é visível na chain, sem
 * viewing key. Modelagem por tx, do ponto de vista do endereço:
 *   - outputs PARA o endereço         → recebimento (entrada).
 *   - inputs DO endereço (prevout)     → gasto; o valor sai do saldo.
 *   - troco (output de volta p/ si)    → NÃO é entrada (desconta do gasto).
 *   - resto que não foi p/ t-addr      → saída "cega" para o pool blindado
 *                                        (sapling/orchard): sabemos quanto, não p/ quem.
 *
 * Saldo é autoritativo do lwd (`GetTaddressBalance`), não computado das txs.
 *
 * Performance: a resolução dos prevouts (1 GetTransaction por input) e dos tempos
 * de bloco roda em PARALELO (concorrência limitada) e com CACHE — endereços
 * movimentados não estouram o deadline. Há um backstop de volume por tesouro.
 * Read-only de ponta a ponta.
 */

import type { ScanRange, ZcashGateway } from "../gateway";
import type {
  ChainOutput,
  ChainTx,
  PaycheckRecord,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "../types";
import {
  getBlockTime,
  getCurrentHeight,
  getTaddressBalance,
  getTaddressTxids,
  getTransaction,
} from "./lwd/lwd-client";
import { parseTransparent, type ParsedTx } from "./lwd/tx-parser";

export interface TransparentTreasury {
  readonly id: string;
  readonly address: string;
  readonly name: string;
  readonly treasuryType: string;
  readonly birthHeight: number;
}

const CONCURRENCY = 8;
const MAX_TXS_PER_TREASURY = 1000;

/** Executa `fn` sobre `items` com no máximo `limit` em voo ao mesmo tempo. */
async function mapLimit<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) await fn(items[i++]);
    },
  );
  await Promise.all(workers);
}

function txOut(
  index: number,
  direction: "in" | "out",
  valueZat: bigint,
  address: string | null,
): ChainOutput {
  return {
    index,
    pool: "transparent",
    direction,
    valueZat,
    address,
    memoRaw: null,
    decryptedVia: "none",
  };
}

export class TransparentLwdGateway implements ZcashGateway {
  constructor(
    private readonly url: string,
    private readonly treasuries: readonly TransparentTreasury[],
  ) {}

  async listViewingKeys(): Promise<readonly ViewingKeyRecord[]> {
    const out: ViewingKeyRecord[] = [];
    for (const t of this.treasuries) {
      const balanceZat = await getTaddressBalance(this.url, [t.address]);
      out.push({
        id: t.id,
        accountLabel: t.name,
        kind: "taddr",
        pools: ["transparent"],
        ufvkMasked: `${t.address} · endereço público (sem segredo)`,
        importedAt: new Date().toISOString(),
        scope: "auditoria transparente (endereço público)",
        status: "active",
        balanceZat,
        treasuryType: t.treasuryType,
      });
    }
    return out;
  }

  async listViewingKeyAccess(): Promise<readonly ViewingKeyAccess[]> {
    return [];
  }
  async listIssuedPaychecks(): Promise<readonly PaycheckRecord[]> {
    return [];
  }

  async scanTransactions(range?: ScanRange): Promise<readonly ChainTx[]> {
    const tip = await getCurrentHeight(this.url);
    const all: ChainTx[] = [];

    for (const t of this.treasuries) {
      const from = range?.fromHeight ?? t.birthHeight;
      const to = range?.toHeight ?? tip;
      const rawTxs = await getTaddressTxids(this.url, t.address, from, to);

      let parsed = rawTxs
        .map((rt) => ({ ptx: parseTransparent(rt.data), height: rt.height }))
        .sort((a, b) => b.height - a.height);
      if (parsed.length > MAX_TXS_PER_TREASURY) {
        console.warn(
          `[transparent] ${t.address}: ${parsed.length} txs > limite ${MAX_TXS_PER_TREASURY}; auditando as mais recentes.`,
        );
        parsed = parsed.slice(0, MAX_TXS_PER_TREASURY);
      }

      // Resolve prevouts (valor dos UTXOs gastos) em paralelo, sem repetir.
      const prevCache = new Map<string, ParsedTx | null>();
      const prevTxids = [
        ...new Set(parsed.flatMap((p) => p.ptx.inputs.map((i) => i.prevTxid))),
      ];
      await mapLimit(prevTxids, CONCURRENCY, async (txid) => {
        const raw = await getTransaction(this.url, txid).catch(() => null);
        prevCache.set(txid, raw ? parseTransparent(raw) : null);
      });

      // Tempos de bloco em paralelo, sem repetir.
      const timeCache = new Map<number, number>();
      const heights = [...new Set(parsed.map((p) => p.height))];
      await mapLimit(heights, CONCURRENCY, async (h) => {
        timeCache.set(h, await getBlockTime(this.url, h).catch(() => 0));
      });

      for (const { ptx, height } of parsed)
        all.push(this.toChainTx(ptx, height, t, prevCache, timeCache));
    }

    return all.sort((a, b) => b.blockHeight - a.blockHeight);
  }

  private toChainTx(
    ptx: ParsedTx,
    height: number,
    t: TransparentTreasury,
    prevCache: ReadonlyMap<string, ParsedTx | null>,
    timeCache: ReadonlyMap<number, number>,
  ): ChainTx {
    const addr = t.address;
    const received = ptx.outputs
      .filter((o) => o.address === addr)
      .reduce((s, o) => s + o.valueZat, 0n);

    let spent = 0n;
    for (const inp of ptx.inputs) {
      const prevOut = prevCache.get(inp.prevTxid)?.outputs[inp.prevIndex];
      if (prevOut?.address === addr) spent += prevOut.valueZat;
    }

    const outputs: ChainOutput[] = [];
    let idx = 0;
    if (spent === 0n) {
      if (received > 0n) outputs.push(txOut(idx++, "in", received, addr));
    } else {
      const externalOut = spent - received; // troco já descontado
      let toOthers = 0n;
      for (const o of ptx.outputs) {
        if (o.address && o.address !== addr) {
          outputs.push(txOut(idx++, "out", o.valueZat, o.address));
          toOthers += o.valueZat;
        }
      }
      const shieldedOut = externalOut - toOthers;
      if (shieldedOut > 0n)
        outputs.push(txOut(idx++, "out", shieldedOut, null));
    }

    const time = timeCache.get(height) ?? 0;
    return {
      txid: ptx.txid,
      blockHeight: height,
      blockTime: new Date(time * 1000).toISOString(),
      pool: "transparent",
      feeZat: 0n,
      treasuryId: t.id,
      outputs,
    };
  }
}
