/**
 * Adapter REAL: implementa ZcashGateway sobre o RPC do zallet (carteira full-node).
 *
 * ⚠️ ACHADOS confirmados contra um zallet v0.1.0-alpha.3 REAL (Raspberry Pi + Zebra):
 *  - O zallet NÃO importa viewing key/UFVK via RPC. Lê as CONTAS que a carteira já
 *    conhece (criadas via seed/`z_recoveraccounts`). `listViewingKeys()` mapeia
 *    `z_listaccounts` como "contas auditadas".
 *  - `z_listtransactions` está QUEBRADO no alpha: estoura
 *    `"Data DB is corrupted: Invalid memo data: InvalidUtf8"` em qualquer conta com
 *    memo binário (ele tenta decodificar memo como UTF-8). Portanto NÃO é usável.
 *  - A leitura confiável é `z_listunspent [minconf, maxconf, includeWatchonly]`, que
 *    devolve `txid, pool, outindex, confirmations, account_uuid, walletInternal,
 *    value (ZEC decimal), valueZat (zatoshis), memo (HEX)`. Mesmo caminho que o
 *    projeto vizinho (zcap-voting) usa em produção.
 *
 * LIMITAÇÕES de `z_listunspent` (documentadas e reportadas ao usuário):
 *  - Só notas NÃO-GASTAS: recebimentos/troco atuais. Notas já gastas e o histórico
 *    de saídas não aparecem (depende de `z_listtransactions`, hoje quebrado).
 *  - Não retorna altura nem timestamp do bloco: derivamos a altura de
 *    `node_tip - confirmations` (via `getwalletstatus`) e ESTIMAMOS o `blockTime`
 *    (~75s/bloco). Não retorna `fee` (fica 0n) nem o endereço da nota.
 *
 * Read-only garantido: só chama métodos de LEITURA; nunca z_sendmany/pay/etc.
 */

import { z } from "zod";
import type { RpcEndpoint } from "@/lib/config/env";
import { getZalletAccountUuid, getZalletEndpoint } from "@/lib/config/env";
import { jsonRpcCall } from "../rpc/json-rpc";
import type { ZcashGateway, ScanRange } from "../gateway";
import type {
  ChainOutput,
  ChainTx,
  Direction,
  PaycheckRecord,
  Pool,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "../types";

/** Tempo-alvo de bloco do Zcash em mainnet (ZIP-208), usado só para estimar datas. */
const BLOCK_TARGET_SECONDS = 75;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/**
 * "No memo" canônico do ZIP-302: primeiro byte 0xF6 e o restante zeros (ou tudo
 * zero). Notas de troco e recebimentos sem memo chegam assim — viram memoRaw null.
 */
function isEmptyMemo(hex: string): boolean {
  const clean = (hex.startsWith("0x") ? hex.slice(2) : hex).toLowerCase();
  if (clean.length === 0) return true;
  if (/^0+$/.test(clean)) return true;
  return clean.startsWith("f6") && /^0+$/.test(clean.slice(2));
}

function poolOf(pool: string | undefined): Pool {
  return pool === "orchard" || pool === "sapling" || pool === "transparent"
    ? pool
    : "orchard";
}

const accountSchema = z
  .object({
    account: z.union([z.string(), z.number()]).optional(),
    account_uuid: z.string().optional(),
    name: z.string().optional(),
    addresses: z.array(z.unknown()).optional(),
  })
  .passthrough();

const unspentNoteSchema = z
  .object({
    txid: z.string(),
    pool: z.string().optional(),
    outindex: z.number().optional(),
    confirmations: z.number().optional(),
    account_uuid: z.string().optional(),
    walletInternal: z.boolean().optional(),
    is_watch_only: z.boolean().optional(),
    value: z.number().optional(),
    valueZat: z.union([z.number(), z.string()]).optional(),
    memo: z.string().optional(), // hex (até 512 bytes)
  })
  .passthrough();

type UnspentNote = z.infer<typeof unspentNoteSchema>;

const walletStatusSchema = z
  .object({
    node_tip: z.object({ height: z.number().optional() }).partial().optional(),
    fully_synced_height: z.number().optional(),
  })
  .passthrough();

function noteValueZat(n: UnspentNote): bigint {
  if (n.valueZat !== undefined) {
    return typeof n.valueZat === "string"
      ? BigInt(n.valueZat)
      : BigInt(Math.round(n.valueZat));
  }
  if (n.value !== undefined) {
    // `value` vem em ZEC decimal; converter sem perder casas.
    return BigInt(Math.round(n.value * 100_000_000));
  }
  return 0n;
}

export class ZalletGateway implements ZcashGateway {
  constructor(
    private readonly endpoint: RpcEndpoint,
    private readonly accountUuid?: string,
  ) {}

  async listViewingKeys(): Promise<readonly ViewingKeyRecord[]> {
    const raw = await jsonRpcCall<unknown>(this.endpoint, "z_listaccounts", []);
    const accounts = z.array(accountSchema).catch([]).parse(raw);
    return accounts.map((a, i): ViewingKeyRecord => {
      const id = a.account_uuid ?? String(a.account ?? `account-${i}`);
      return {
        id,
        accountLabel: a.name ?? `Conta zallet ${id.slice(0, 8)}`,
        kind: "ufvk",
        pools: ["orchard", "sapling", "transparent"],
        ufvkMasked: `${id.slice(0, 10)}… (conta zallet)`,
        importedAt: new Date().toISOString(),
        scope: "auditoria (read-only via zallet)",
        status: "active",
      };
    });
  }

  // Acesso e contra-cheques emitidos são dados do nosso sistema (Postgres), não do zallet.
  async listViewingKeyAccess(): Promise<readonly ViewingKeyAccess[]> {
    return [];
  }
  async listIssuedPaychecks(): Promise<readonly PaycheckRecord[]> {
    return [];
  }

  async scanTransactions(range?: ScanRange): Promise<readonly ChainTx[]> {
    // z_listunspent não traz altura; derivamos do tip da chain.
    const status = await jsonRpcCall<unknown>(
      this.endpoint,
      "getwalletstatus",
      [],
    );
    const tipHeight =
      walletStatusSchema.catch({}).parse(status).node_tip?.height ?? 0;

    const raw = await jsonRpcCall<unknown>(this.endpoint, "z_listunspent", [
      0,
      9_999_999,
      true,
    ]);
    const notes = z.array(unspentNoteSchema).catch([]).parse(raw);

    const relevant = this.accountUuid
      ? notes.filter((n) => n.account_uuid === this.accountUuid)
      : notes;

    return this.groupNotes(relevant, tipHeight, range);
  }

  /** Agrupa as notas não-gastas (uma por output) em ChainTx (uma por txid). */
  private groupNotes(
    notes: readonly UnspentNote[],
    tipHeight: number,
    range?: ScanRange,
  ): ChainTx[] {
    const byTxid = new Map<string, UnspentNote[]>();
    for (const n of notes) {
      const list = byTxid.get(n.txid) ?? [];
      list.push(n);
      byTxid.set(n.txid, list);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const txs: ChainTx[] = [];

    for (const [txid, list] of byTxid) {
      const conf = list[0].confirmations ?? 0;
      const blockHeight =
        conf > 0 && tipHeight > 0 ? Math.max(1, tipHeight - conf + 1) : 0;

      if (range && blockHeight > 0) {
        if (blockHeight < range.fromHeight) continue;
        if (range.toHeight !== undefined && blockHeight > range.toHeight) {
          continue;
        }
      }

      // Estimativa: o zallet não devolve o timestamp do bloco em z_listunspent.
      const estSec = conf > 0 ? nowSec - conf * BLOCK_TARGET_SECONDS : nowSec;

      const outputs: ChainOutput[] = list.map((n, idx): ChainOutput => {
        const pool = poolOf(n.pool);
        const direction: Direction = n.walletInternal ? "change" : "in";
        const memoHex = n.memo;
        return {
          index: n.outindex ?? idx,
          pool,
          direction,
          valueZat: noteValueZat(n),
          address: null,
          memoRaw:
            memoHex && !isEmptyMemo(memoHex) ? hexToBytes(memoHex) : null,
          decryptedVia: pool === "transparent" ? "none" : "ivk",
        };
      });

      txs.push({
        txid,
        blockHeight,
        blockTime: new Date(estSec * 1000).toISOString(),
        pool: outputs[0]?.pool ?? "orchard",
        feeZat: 0n, // z_listunspent não expõe fee
        outputs,
      });
    }

    return txs.sort((a, b) => b.blockHeight - a.blockHeight);
  }
}

export function createZalletGateway(): ZalletGateway {
  const endpoint = getZalletEndpoint();
  if (!endpoint) {
    throw new Error(
      "ZALLET_RPC_URL não configurado (necessário para ZCASH_GATEWAY=real).",
    );
  }
  return new ZalletGateway(endpoint, getZalletAccountUuid());
}
