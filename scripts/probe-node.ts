/**
 * Sonda standalone do node Zcash (sem depender do Next).
 * Uso: npm run probe   (carrega .env.local)
 *
 * Quando o RPC do Zebra/zallet estiver acessível na LAN, isto confirma
 * conectividade, auth e métodos antes de ligar ZCASH_GATEWAY=real.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

async function rpc(
  url: string,
  user: string | undefined,
  pass: string | undefined,
  method: string,
  params: unknown[] = [],
): Promise<unknown> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (user) {
    headers.authorization =
      "Basic " + Buffer.from(`${user}:${pass ?? ""}`).toString("base64");
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return `HTTP ${res.status}: ${text.slice(0, 200)}`;
    }
  } catch (e) {
    return `ERRO: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const zebraUrl = process.env.ZEBRA_RPC_URL;
  const zalletUrl = process.env.ZALLET_RPC_URL;

  console.log("== Zebra (chain) ==", zebraUrl ?? "(não configurado)");
  if (zebraUrl) {
    console.log(
      "getblockchaininfo:",
      JSON.stringify(
        await rpc(
          zebraUrl,
          process.env.ZEBRA_RPC_USER,
          process.env.ZEBRA_RPC_PASSWORD,
          "getblockchaininfo",
        ),
      ).slice(0, 400),
    );
  }

  console.log("\n== zallet (wallet) ==", zalletUrl ?? "(não configurado)");
  if (zalletUrl) {
    for (const method of ["getwalletstatus", "z_listaccounts"]) {
      console.log(
        `${method}:`,
        JSON.stringify(
          await rpc(
            zalletUrl,
            process.env.ZALLET_RPC_USER,
            process.env.ZALLET_RPC_PASSWORD,
            method,
          ),
        ).slice(0, 400),
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
