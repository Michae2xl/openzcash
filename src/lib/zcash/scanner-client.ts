/**
 * Cliente HTTP do scanner Zcash stateless (o mesmo `ppf-scanner` em Rust que o
 * paidprivatefile usa). Faz a parte CRIPTOGRÁFICA — validar uma UFVK e derivar
 * endereços diversificados — SEM rodar nó: nada de Zebra/zallet/zkool na LAN.
 *
 * Contrato:
 *   POST /validate          { ufvk, ua? }              → valida + endereço default
 *   POST /sellers/register  { ufvk }                   → guarda a UFVK, devolve scanRef
 *   POST /derive            { scanRef, diversifierIndex } → endereço naquele índice
 *
 * Auth: cada request leva `x-ppf-scanner-sig` = hex HMAC-SHA256(rawBody, SECRET).
 * Custódia: o scanner guarda a UFVK; o app persiste só o `scanRef` opaco.
 */

import "server-only";
import { createHmac } from "node:crypto";

export type ScannerNetwork = "main" | "test" | "regtest";

export interface ScannerValidateResult {
  valid: boolean;
  network: ScannerNetwork;
  fingerprint: string;
  defaultAddress: string;
  receivers: string[];
}

export interface ScannerRegisterResult {
  /** Handle opaco da UFVK, guardado só no host do scanner. */
  scanRef: string;
  fingerprint: string;
  network: ScannerNetwork;
  defaultAddress: string;
  receivers: string[];
}

export interface ScannerDeriveResult {
  address: string;
  actualIndex: number;
}

const FINGERPRINT = /^[0-9a-f]{64}$/;
const REQUEST_TIMEOUT_MS = 15_000;

function baseUrl(): string {
  const raw = process.env.SCANNER_URL?.trim();
  if (!raw) throw new Error("Scanner is not configured (SCANNER_URL).");
  return raw.replace(/\/+$/, "");
}

function secret(): string {
  const raw = process.env.SCANNER_SECRET?.trim();
  if (!raw) throw new Error("Scanner is not configured (SCANNER_SECRET).");
  return raw;
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const rawBody = JSON.stringify(body);
  const sig = createHmac("sha256", secret()).update(rawBody).digest("hex");

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ppf-scanner-sig": sig },
      body: rawBody,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    throw new Error(
      `Scanner request failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (!res.ok) {
    // 400 = entrada inválida (UFVK rejeitada) → mensagem amigável.
    if (res.status === 400) {
      let message = "The viewing key (UFVK) was rejected.";
      try {
        const j = (await res.json()) as { error?: { message?: string } };
        if (j?.error?.message) message = j.error.message;
      } catch {
        /* mantém o default */
      }
      throw new Error(message);
    }
    throw new Error(`Scanner returned HTTP ${res.status}`);
  }

  const parsed = (await res.json()) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Scanner returned an invalid response.");
  }
  return parsed as Record<string, unknown>;
}

function str(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  if (typeof v !== "string" || !v) {
    throw new Error(`Scanner response missing field: ${key}`);
  }
  return v;
}

function network(r: Record<string, unknown>): ScannerNetwork {
  const v = r.network;
  if (v === "main" || v === "test" || v === "regtest") return v;
  throw new Error("Scanner response has an invalid network.");
}

function receivers(r: Record<string, unknown>): string[] {
  const v = r.receivers;
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    throw new Error("Scanner response has invalid receivers.");
  }
  return v as string[];
}

function fingerprint(r: Record<string, unknown>): string {
  const fp = str(r, "fingerprint");
  if (!FINGERPRINT.test(fp)) {
    throw new Error("Scanner response has an invalid fingerprint.");
  }
  return fp;
}

/** Valida uma UFVK (read-only) e devolve o endereço default. Não guarda nada. */
export async function validateUfvk(
  ufvk: string,
  ua?: string,
): Promise<ScannerValidateResult> {
  const r = await postJson("/validate", ua ? { ufvk, ua } : { ufvk });
  const valid = r.valid;
  if (typeof valid !== "boolean") {
    throw new Error("Scanner response missing field: valid");
  }
  return {
    valid,
    network: network(r),
    fingerprint: fingerprint(r),
    defaultAddress: str(r, "defaultAddress"),
    receivers: receivers(r),
  };
}

/** Registra a UFVK no scanner e devolve o scanRef (a chave fica só lá). */
export async function registerUfvk(
  ufvk: string,
): Promise<ScannerRegisterResult> {
  const r = await postJson("/sellers/register", { ufvk });
  return {
    scanRef: str(r, "scanRef"),
    network: network(r),
    fingerprint: fingerprint(r),
    defaultAddress: str(r, "defaultAddress"),
    receivers: receivers(r),
  };
}

/** Deriva o endereço no índice de diversificador dado (1 por mês). */
export async function deriveAddress(
  scanRef: string,
  diversifierIndex: number,
): Promise<ScannerDeriveResult> {
  const r = await postJson("/derive", { scanRef, diversifierIndex });
  const actualIndex = r.actualIndex;
  if (!Number.isSafeInteger(actualIndex) || (actualIndex as number) < 0) {
    throw new Error("Scanner response has an invalid actualIndex.");
  }
  return { address: str(r, "address"), actualIndex: actualIndex as number };
}
