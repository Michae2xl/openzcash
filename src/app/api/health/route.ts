/**
 * GET /api/health — testa conectividade com Zebra (chain) e zallet (wallet).
 * Útil para validar o node real assim que o RPC estiver acessível na LAN.
 */

import {
  getEnv,
  getZalletEndpoint,
  getZebraEndpoint,
  type RpcEndpoint,
} from "@/lib/config/env";
import { jsonRpcCall } from "@/lib/zcash/rpc/json-rpc";

export const dynamic = "force-dynamic";

function pick(res: unknown): unknown {
  if (res && typeof res === "object") {
    const o = res as Record<string, unknown>;
    const keys = ["chain", "blocks", "estimatedheight", "synced", "version"];
    const out: Record<string, unknown> = {};
    for (const k of keys) if (o[k] !== undefined) out[k] = o[k];
    return Object.keys(out).length ? out : "ok";
  }
  return res;
}

async function probe(
  label: string,
  endpoint: RpcEndpoint | null,
  method: string,
) {
  if (!endpoint) {
    return { label, configured: false, ok: false, note: "não configurado" };
  }
  try {
    const res = await jsonRpcCall(endpoint, method, [], { timeoutMs: 4000 });
    return {
      label,
      configured: true,
      ok: true,
      method,
      url: endpoint.url,
      sample: pick(res),
    };
  } catch (e) {
    return {
      label,
      configured: true,
      ok: false,
      method,
      url: endpoint.url,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function GET() {
  const env = getEnv();
  const [zebra, zallet] = await Promise.all([
    probe("zebra", getZebraEndpoint(), "getblockchaininfo"),
    probe("zallet", getZalletEndpoint(), "getwalletstatus"),
  ]);
  return Response.json({ gateway: env.ZCASH_GATEWAY, zebra, zallet });
}
