/**
 * Adapter REAL via zkool2 (servidor `zkool_graphql`) — engine recomendada.
 *
 * Schema confirmado AO VIVO (hhanh00/zkool2, mainnet via lwd zec.rocks):
 *   Transaction { id, txid, account, height, time(LocalDateTime), value(±BigDecimal),
 *                 fee(BigDecimal), notes:[Note], outputs:[Output], spends:[Note] }
 *   Note   { id, height, pool(Int), value, address, scope(Int), diversifier, memo, tx }
 *   Output { id, pool(Int), vout, value, address, memo }
 *
 * Modelagem (confirmada com uma conta real):
 *   - `notes`   = o que a conta RECEBEU nesta tx → entradas (scope externo) e troco
 *                 (scope interno). Recebimentos NÃO aparecem em `outputs`.
 *   - `outputs` = os destinos que a conta ENVIOU, decifrados via OVK (com o memo de
 *                 saída, ex.: nosso `zacct:`).
 * Por isso mapeamos notes (in/change) E outputs (out).
 *
 * Vantagem sobre o zallet: importa UFVK watch-only (`createAccount key=UFVK, birth`),
 * traz o HISTÓRICO completo, memo decodificado e o timestamp REAL do bloco. `value`/`fee`
 * em ZEC decimal (BigDecimal), `value` da tx com sinal.
 *
 * Read-only garantido: só consome queries; nunca chama `pay`/`signTx`/`broadcastTx`.
 *
 * ⚠️ A refinar com mais dados: `pool` Int (assumido 0=transparent,1=sapling,2=orchard)
 * e `scope` Int (assumido 0=externo/in, !=0=interno/change).
 */

import { z } from "zod";
import type { GraphQLEndpoint } from "@/lib/config/env";
import { getZkoolEndpoint } from "@/lib/config/env";
import { gqlRequest } from "../rpc/graphql";
import { encodeTextMemo } from "../memo/zip302";
import { zecToZatoshis } from "../units";
import type { ScanRange, ZcashGateway } from "../gateway";
import type {
  ChainOutput,
  ChainTx,
  Direction,
  PaycheckRecord,
  Pool,
  ViewingKeyAccess,
  ViewingKeyRecord,
} from "../types";

/** ZEC decimal → zatoshis, robusto a sinal e notação científica (BigDecimal). */
function toZat(v: string | number): bigint {
  const s = String(v).trim();
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  let mag: bigint;
  try {
    mag = zecToZatoshis(body);
  } catch {
    const n = Number(body);
    mag = Number.isFinite(n) ? BigInt(Math.round(n * 1e8)) : 0n;
  }
  return neg ? -mag : mag;
}

const absBig = (v: bigint): bigint => (v < 0n ? -v : v);

function poolFromInt(p: number | null | undefined): Pool {
  if (p === 0) return "transparent";
  if (p === 1) return "sapling";
  return "orchard";
}

function isBlankMemo(m: string): boolean {
  return m.trim() === "";
}

const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  balance: z.union([z.string(), z.number()]).nullish(),
});

const noteSchema = z.object({
  pool: z.number().nullish(),
  value: z.union([z.string(), z.number()]),
  address: z.string().nullish(),
  scope: z.number().nullish(),
  memo: z.string().nullish(),
});

const outputSchema = z.object({
  pool: z.number().nullish(),
  vout: z.number().nullish(),
  value: z.union([z.string(), z.number()]),
  address: z.string().nullish(),
  memo: z.string().nullish(),
});

const txSchema = z.object({
  id: z.number(),
  txid: z.string(),
  height: z.number(),
  time: z.string(),
  value: z.union([z.string(), z.number()]),
  fee: z.union([z.string(), z.number()]),
  notes: z.array(noteSchema).default([]),
  outputs: z.array(outputSchema).default([]),
  spends: z.array(noteSchema).default([]),
});

const ACCOUNTS_QUERY = `query { accounts { id name balance } }`;
const TXS_QUERY = `query ($id: Int!) {
  transactionsByAccount(idAccount: $id) {
    id txid height time value fee
    notes { pool value address scope memo }
    outputs { pool vout value address memo }
    spends { pool value }
  }
}`;

export class ZkoolGateway implements ZcashGateway {
  constructor(private readonly endpoint: GraphQLEndpoint) {}

  /**
   * Onboarding de auditoria: importa uma UFVK como conta WATCH-ONLY e devolve o
   * id_account. `birth` = altura inicial do trial-decryption (use a birthday height
   * da carteira de tesouraria para um scan eficiente).
   */
  async importViewingKey(
    ufvk: string,
    name: string,
    birth = 0,
  ): Promise<number> {
    const data = await gqlRequest<{ createAccount: number }>(
      this.endpoint,
      `mutation ($acc: NewAccount!) { createAccount(newAccount: $acc) }`,
      { acc: { name, key: ufvk, aindex: 0, birth, useInternal: false } },
    );
    return data.createAccount;
  }

  async synchronize(idAccounts: number[]): Promise<number> {
    const data = await gqlRequest<{ synchronize: number }>(
      this.endpoint,
      `mutation ($ids: [Int!]!) { synchronize(idAccounts: $ids) }`,
      { ids: idAccounts },
    );
    return data.synchronize;
  }

  /**
   * Deriva o PRÓXIMO endereço diversificado da conta (avança o diversifier index
   * no zkool). Determinístico pela UFVK e válido em conta WATCH-ONLY — só a IVK
   * basta para derivar. Retorna o índice efetivo (para mapear mês ↔ endereço).
   */
  async newAddress(
    idAccount: number,
  ): Promise<{ address: string; diversifierIndex: number }> {
    const data = await gqlRequest<{
      newAddresses: {
        ua: string | null;
        orchard: string | null;
        diversifierIndex: string | number;
      };
    }>(
      this.endpoint,
      `mutation ($id: Int!) { newAddresses(idAccount: $id) { ua orchard diversifierIndex } }`,
      { id: idAccount },
    );
    const a = data.newAddresses;
    return {
      address: a.ua ?? a.orchard ?? "",
      diversifierIndex: Number(a.diversifierIndex),
    };
  }

  async listViewingKeys(): Promise<readonly ViewingKeyRecord[]> {
    const data = await gqlRequest<{ accounts: unknown[] }>(
      this.endpoint,
      ACCOUNTS_QUERY,
    );
    const accounts = z.array(accountSchema).parse(data.accounts);
    return accounts.map(
      (a): ViewingKeyRecord => ({
        id: String(a.id),
        accountLabel: a.name || `Conta zkool ${a.id}`,
        kind: "ufvk",
        pools: ["orchard", "sapling", "transparent"],
        ufvkMasked: `conta zkool #${a.id} (watch-only)`,
        importedAt: new Date().toISOString(),
        scope: "auditoria (read-only via zkool)",
        status: "active",
        balanceZat: a.balance != null ? toZat(a.balance) : undefined,
      }),
    );
  }

  // Acesso e contra-cheques emitidos são dados do nosso sistema (Postgres), não do zkool.
  async listViewingKeyAccess(): Promise<readonly ViewingKeyAccess[]> {
    return [];
  }
  async listIssuedPaychecks(): Promise<readonly PaycheckRecord[]> {
    return [];
  }

  async scanTransactions(range?: ScanRange): Promise<readonly ChainTx[]> {
    const accData = await gqlRequest<{ accounts: unknown[] }>(
      this.endpoint,
      ACCOUNTS_QUERY,
    );
    const accounts = z.array(accountSchema).parse(accData.accounts);

    const all: ChainTx[] = [];
    for (const acc of accounts) {
      const data = await gqlRequest<{ transactionsByAccount: unknown[] }>(
        this.endpoint,
        TXS_QUERY,
        { id: acc.id },
      );
      const txs = z.array(txSchema).parse(data.transactionsByAccount);
      for (const tx of txs) {
        if (range && tx.height < range.fromHeight) continue;
        if (range?.toHeight !== undefined && tx.height > range.toHeight)
          continue;
        all.push(this.mapTx(tx, String(acc.id)));
      }
    }
    return all.sort((a, b) => b.blockHeight - a.blockHeight);
  }

  private mapTx(tx: z.infer<typeof txSchema>, treasuryId: string): ChainTx {
    const feeZat = absBig(toZat(tx.fee));
    const outputs: ChainOutput[] = [];
    let idx = 0;

    // Recebidas pela conta (entradas e troco), decifradas via IVK.
    for (const n of tx.notes) {
      const pool = poolFromInt(n.pool);
      const direction: Direction =
        n.scope !== null && n.scope !== undefined && n.scope !== 0
          ? "change"
          : "in";
      const memo = n.memo ?? null;
      outputs.push({
        index: idx++,
        pool,
        direction,
        valueZat: absBig(toZat(n.value)),
        address: n.address ?? null,
        memoRaw: memo && !isBlankMemo(memo) ? encodeTextMemo(memo) : null,
        decryptedVia: pool === "transparent" ? "none" : "ivk",
      });
    }

    // Enviadas pela conta (destinos), com memo de saída decifrado via OVK.
    for (const o of tx.outputs) {
      const pool = poolFromInt(o.pool);
      const memo = o.memo ?? null;
      outputs.push({
        index: o.vout ?? idx++,
        pool,
        direction: "out",
        valueZat: absBig(toZat(o.value)),
        address: o.address ?? null,
        memoRaw: memo && !isBlankMemo(memo) ? encodeTextMemo(memo) : null,
        decryptedVia: pool === "transparent" ? "none" : "ovk",
      });
    }

    // Nota: com o sync SEM `fast` o zkool decifra os destinos via OVK (fase
    // `fetch_tx_details`), então as saídas reais vêm em `outputs` (com endereço).
    // A diferença entre o que foi gasto (`spends`) e o que saiu para terceiros é
    // movimentação interna cross-pool (ex.: migração Sapling→Orchard) — NÃO é
    // pagamento, então não inventamos uma "saída cega" aqui.

    return {
      txid: tx.txid,
      blockHeight: tx.height,
      blockTime: new Date(`${tx.time}Z`).toISOString(),
      pool: outputs[0]?.pool ?? "orchard",
      feeZat,
      treasuryId,
      outputs,
    };
  }
}

export function createZkoolGateway(): ZkoolGateway {
  const endpoint = getZkoolEndpoint();
  if (!endpoint) {
    throw new Error(
      "ZKOOL_GRAPHQL_URL não configurado (necessário para ZCASH_GATEWAY=zkool).",
    );
  }
  return new ZkoolGateway(endpoint);
}
