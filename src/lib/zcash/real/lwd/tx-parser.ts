/**
 * Parser do componente TRANSPARENTE de uma transação Zcash (serialização v4/v5).
 *
 * Só precisamos dos `tx_in` (prevout: txid+index) e dos `tx_out` (valor + endereço
 * t1/t3) — a parte shielded (sapling/orchard) vem DEPOIS dos outputs e é ignorada.
 * Para um endereço transparente isso basta: outputs PARA o endereço = recebimentos;
 * inputs cujo prevout pertence ao endereço = gastos (resolvidos à parte).
 *
 * `txid` aqui é um id ESTÁVEL derivado (sha256d do corpo), usado como chave única
 * de deduplicação — NÃO é o txid canônico ZIP-244 (v5). A resolução de prevouts usa
 * o `prevTxid` real que vem dentro dos inputs, então a contabilidade fecha mesmo
 * assim. (Refinar para o txid canônico é um passo futuro.)
 */

import { createHash } from "node:crypto";

export interface TxInput {
  readonly prevTxid: string; // big-endian (como exibido em explorers)
  readonly prevIndex: number;
}
export interface TxOutput {
  readonly valueZat: bigint;
  /** Endereço t1/t3 ou null quando o output é shielded/não-padrão. */
  readonly address: string | null;
}
export interface ParsedTx {
  readonly txid: string;
  readonly inputs: readonly TxInput[];
  readonly outputs: readonly TxOutput[];
}

const sha256 = (b: Buffer): Buffer => createHash("sha256").update(b).digest();

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58check(version: readonly number[], payload: Buffer): string {
  const data = Buffer.concat([Buffer.from(version), payload]);
  const full = Buffer.concat([data, sha256(sha256(data)).subarray(0, 4)]);
  let n = BigInt("0x" + (full.toString("hex") || "0"));
  let out = "";
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of full) {
    if (b === 0) out = "1" + out;
    else break;
  }
  return out;
}

function readVarint(b: Buffer, o: number): [number, number] {
  const x = b[o];
  if (x < 0xfd) return [x, o + 1];
  if (x === 0xfd) return [b.readUInt16LE(o + 1), o + 3];
  if (x === 0xfe) return [b.readUInt32LE(o + 1), o + 5];
  return [Number(b.readBigUInt64LE(o + 1)), o + 9];
}

/** scriptPubKey → endereço transparente Zcash mainnet (t1 P2PKH / t3 P2SH). */
function scriptToAddress(s: Buffer): string | null {
  if (
    s.length === 25 &&
    s[0] === 0x76 &&
    s[1] === 0xa9 &&
    s[2] === 0x14 &&
    s[23] === 0x88 &&
    s[24] === 0xac
  )
    return base58check([0x1c, 0xb8], s.subarray(3, 23)); // t1
  if (s.length === 23 && s[0] === 0xa9 && s[1] === 0x14 && s[22] === 0x87)
    return base58check([0x1c, 0xbd], s.subarray(2, 22)); // t3
  return null;
}

/** Parseia o bundle transparente de uma tx serializada (v4/v5). */
export function parseTransparent(raw: Buffer): ParsedTx {
  // header(4) + nVersionGroupId(4) + nConsensusBranchId(4) + lockTime(4) + nExpiryHeight(4)
  let o = 20;
  let nin: number;
  [nin, o] = readVarint(raw, o);
  const inputs: TxInput[] = [];
  for (let i = 0; i < nin; i++) {
    const prevTxid = Buffer.from(raw.subarray(o, o + 32))
      .reverse()
      .toString("hex");
    o += 32;
    const prevIndex = raw.readUInt32LE(o);
    o += 4;
    let sl: number;
    [sl, o] = readVarint(raw, o);
    o += sl + 4; // script + sequence
    inputs.push({ prevTxid, prevIndex });
  }
  let nout: number;
  [nout, o] = readVarint(raw, o);
  const outputs: TxOutput[] = [];
  for (let i = 0; i < nout; i++) {
    const valueZat = raw.readBigUInt64LE(o);
    o += 8;
    let sl: number;
    [sl, o] = readVarint(raw, o);
    outputs.push({
      valueZat,
      address: scriptToAddress(raw.subarray(o, o + sl)),
    });
    o += sl;
  }
  const txid = Buffer.from(sha256(sha256(raw)))
    .reverse()
    .toString("hex");
  return { txid, inputs, outputs };
}
