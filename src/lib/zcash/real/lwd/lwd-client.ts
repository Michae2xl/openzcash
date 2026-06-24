/**
 * Cliente gRPC do lightwalletd (CompactTxStreamer) — só os métodos read-only de
 * que precisamos para auditar um endereço TRANSPARENTE, sem viewing key:
 *   - GetTaddressBalance  → saldo on-chain exato (fonte de verdade do saldo).
 *   - GetTaddressTxids    → stream das txs que tocam o endereço (RawTransaction).
 *   - GetTransaction      → uma tx por hash (para resolver o valor dos prevouts).
 *
 * Read-only: jamais chama SendTransaction. TLS quando a porta é :443.
 */

import path from "node:path";
import { credentials, type CallOptions, type Client } from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import * as protoLoader from "@grpc/proto-loader";
import { loadPackageDefinition } from "@grpc/grpc-js";

export interface RawTx {
  readonly data: Buffer;
  readonly height: number;
}

interface StreamerClient extends Client {
  GetTaddressBalance(
    arg: { addresses: string[] },
    options: CallOptions,
    cb: (err: Error | null, resp?: { valueZat?: string | number }) => void,
  ): void;
  GetTransaction(
    arg: { hash: Buffer },
    options: CallOptions,
    cb: (err: Error | null, resp?: { data?: Uint8Array }) => void,
  ): void;
  GetTaddressTxids(
    arg: {
      address: string;
      range: { start: { height: number }; end: { height: number } };
    },
    options: CallOptions,
  ): NodeJS.EventEmitter;
  GetLightdInfo(
    arg: Record<string, never>,
    options: CallOptions,
    cb: (err: Error | null, resp?: { blockHeight?: string | number }) => void,
  ): void;
  GetBlock(
    arg: { height: number },
    options: CallOptions,
    cb: (err: Error | null, resp?: { time?: number }) => void,
  ): void;
}

/** Deadline de cada chamada gRPC — evita pendurar o scan indefinidamente. */
const DEADLINE_MS = 120_000;
const opts = (): CallOptions => ({ deadline: Date.now() + DEADLINE_MS });

const PROTO_DIR = path.join(process.cwd(), "src/lib/zcash/real/lwd/protos");

let cached: StreamerClient | null = null;
let cachedUrl = "";

function getClient(url: string): StreamerClient {
  if (cached && cachedUrl === url) return cached;
  const def = loadSync(path.join(PROTO_DIR, "service.proto"), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  } satisfies protoLoader.Options);
  const pkg = loadPackageDefinition(def) as unknown as {
    cash: {
      z: {
        wallet: {
          sdk: {
            rpc: {
              CompactTxStreamer: new (
                url: string,
                creds: ReturnType<typeof credentials.createSsl>,
              ) => StreamerClient;
            };
          };
        };
      };
    };
  };
  const creds = url.endsWith(":443")
    ? credentials.createSsl()
    : credentials.createInsecure();
  cached = new pkg.cash.z.wallet.sdk.rpc.CompactTxStreamer(url, creds);
  cachedUrl = url;
  return cached;
}

export function getTaddressBalance(
  url: string,
  addresses: readonly string[],
): Promise<bigint> {
  return new Promise((resolve, reject) => {
    getClient(url).GetTaddressBalance(
      { addresses: [...addresses] },
      opts(),
      (err, r) => (err ? reject(err) : resolve(BigInt(r?.valueZat ?? 0))),
    );
  });
}

export function getTaddressTxids(
  url: string,
  address: string,
  fromHeight: number,
  toHeight: number,
): Promise<RawTx[]> {
  return new Promise((resolve, reject) => {
    const call = getClient(url).GetTaddressTxids(
      {
        address,
        range: { start: { height: fromHeight }, end: { height: toHeight } },
      },
      opts(),
    );
    const out: RawTx[] = [];
    call.on("data", (r: { data: Uint8Array; height: string | number }) =>
      out.push({ data: Buffer.from(r.data), height: Number(r.height) }),
    );
    call.on("end", () => resolve(out));
    call.on("error", reject);
  });
}

export function getCurrentHeight(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    getClient(url).GetLightdInfo({}, opts(), (err, r) =>
      err ? reject(err) : resolve(Number(r?.blockHeight ?? 0)),
    );
  });
}

export function getBlockTime(url: string, height: number): Promise<number> {
  return new Promise((resolve, reject) => {
    getClient(url).GetBlock({ height }, opts(), (err, r) =>
      err ? reject(err) : resolve(Number(r?.time ?? 0)),
    );
  });
}

/** Resolve uma tx por txid (big-endian/display). Null se não encontrada. */
export function getTransaction(
  url: string,
  txidBigEndianHex: string,
): Promise<Buffer | null> {
  const hash = Buffer.from(txidBigEndianHex, "hex").reverse();
  return new Promise((resolve, reject) => {
    getClient(url).GetTransaction({ hash }, opts(), (err, r) =>
      err ? reject(err) : resolve(r?.data ? Buffer.from(r.data) : null),
    );
  });
}
