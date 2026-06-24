/**
 * Cliente JSON-RPC 2.0 minimalista para falar com Zebra e zallet.
 * Basic auth opcional, timeout via AbortController, erros explícitos.
 */

import type { RpcEndpoint } from "@/lib/config/env";

export class JsonRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "JsonRpcError";
  }
}

export class RpcTransportError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RpcTransportError";
  }
}

function authHeader(endpoint: RpcEndpoint): Record<string, string> {
  if (!endpoint.user) return {};
  const raw = `${endpoint.user}:${endpoint.password ?? ""}`;
  const token = Buffer.from(raw, "utf8").toString("base64");
  return { authorization: `Basic ${token}` };
}

export async function jsonRpcCall<T = unknown>(
  endpoint: RpcEndpoint,
  method: string,
  params: readonly unknown[] = [],
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);

  let res: Response;
  try {
    res = await fetch(endpoint.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeader(endpoint) },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });
  } catch (cause) {
    throw new RpcTransportError(
      `Falha ao conectar em ${endpoint.url} (${method}): ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      cause,
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new RpcTransportError(
      `HTTP ${res.status} de ${endpoint.url} (${method}): ${body.slice(0, 200)}`,
    );
  }

  const payload = (await res.json()) as {
    result?: T;
    error?: { code: number; message: string; data?: unknown };
  };

  if (payload.error) {
    throw new JsonRpcError(
      `${method}: ${payload.error.message}`,
      payload.error.code,
      payload.error.data,
    );
  }
  return payload.result as T;
}
