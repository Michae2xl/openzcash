/**
 * Cliente do node Zebra — apenas informação de chain (Zebra não tem wallet).
 *
 * Auth: o Zebra usa cookie-auth por padrão (≥ v2.0.0), em ~/.cache/zebra/.cookie.
 * Para acesso via LAN sem cookie, defina no Zebra `rpc.enable_cookie_auth = false`
 * e proteja por rede/firewall. Este cliente usa basic-auth se ZEBRA_RPC_USER estiver
 * definido; senão envia sem auth. (Verificado: zebra.zfnd.org + docs.rs/zebra-rpc)
 */

import { getZebraEndpoint } from "@/lib/config/env";
import { jsonRpcCall } from "../rpc/json-rpc";

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  bestblockhash: string;
  estimatedheight?: number;
}

export class ZebraClient {
  constructor(private readonly endpoint = getZebraEndpoint()) {}

  private requireEndpoint() {
    if (!this.endpoint) {
      throw new Error("ZEBRA_RPC_URL não configurado.");
    }
    return this.endpoint;
  }

  async getInfo(): Promise<Record<string, unknown>> {
    return jsonRpcCall(this.requireEndpoint(), "getinfo", []);
  }

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    return jsonRpcCall<BlockchainInfo>(
      this.requireEndpoint(),
      "getblockchaininfo",
      [],
    );
  }

  async getBestBlockHash(): Promise<string> {
    return jsonRpcCall<string>(this.requireEndpoint(), "getbestblockhash", []);
  }
}
