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
import { getIsAdmin } from "@/lib/auth/admin";
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

/**
 * `detailed` is true only for an authenticated admin. Public callers get just
 * the booleans — the internal node URLs and raw RPC errors stay hidden so the
 * health endpoint can't be used to map the infrastructure behind the app.
 */
async function probe(
  label: string,
  endpoint: RpcEndpoint | null,
  method: string,
  detailed: boolean,
) {
  if (!endpoint) {
    return { label, configured: false, ok: false };
  }
  try {
    const res = await jsonRpcCall(endpoint, method, [], { timeoutMs: 4000 });
    return detailed
      ? {
          label,
          configured: true,
          ok: true,
          method,
          url: endpoint.url,
          sample: pick(res),
        }
      : { label, configured: true, ok: true };
  } catch (e) {
    return detailed
      ? {
          label,
          configured: true,
          ok: false,
          method,
          url: endpoint.url,
          error: e instanceof Error ? e.message : String(e),
        }
      : { label, configured: true, ok: false };
  }
}

export async function GET() {
  const isAdmin = await getIsAdmin();
  const env = getEnv();
  const [zebra, zallet] = await Promise.all([
    probe("zebra", getZebraEndpoint(), "getblockchaininfo", isAdmin),
    probe("zallet", getZalletEndpoint(), "getwalletstatus", isAdmin),
  ]);
  return Response.json(
    isAdmin ? { gateway: env.ZCASH_GATEWAY, zebra, zallet } : { zebra, zallet },
  );
}
