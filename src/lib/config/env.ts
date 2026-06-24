/**
 * Configuração da aplicação, validada no boundary com Zod.
 *
 * Segredos vêm SEMPRE de variáveis de ambiente (.env.local em dev, secret manager
 * em prod) — nunca hardcoded. Next injeta o .env.local automaticamente no servidor;
 * scripts (drizzle-kit, scanner CLI) carregam via dotenv antes de importar isto.
 */

import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
    ZCASH_GATEWAY: z.enum(["mock", "real", "zkool"]).default("mock"),

    // zallet (RPC JSON) — adapter "real"
    ZEBRA_RPC_URL: z.string().url().optional(),
    ZEBRA_RPC_USER: z.string().optional(),
    ZEBRA_RPC_PASSWORD: z.string().optional(),
    ZALLET_RPC_URL: z.string().url().optional(),
    ZALLET_RPC_USER: z.string().optional(),
    ZALLET_RPC_PASSWORD: z.string().optional(),
    // Conta (UUID) a auditar no zallet. O zallet expõe várias contas; o scan
    // filtra as notas por esta. Sem ela, considera todas as contas da carteira.
    ZALLET_ACCOUNT_UUID: z.string().optional(),

    // zkool (GraphQL) — adapter "zkool" (recomendado: tem UFVK watch-only + FROST)
    ZKOOL_GRAPHQL_URL: z.string().url().optional(),
    ZKOOL_JWT_TOKEN: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.ZCASH_GATEWAY === "real" && !val.ZALLET_RPC_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ZALLET_RPC_URL"],
        message: "ZALLET_RPC_URL é obrigatório quando ZCASH_GATEWAY=real",
      });
    }
    if (val.ZCASH_GATEWAY === "zkool" && !val.ZKOOL_GRAPHQL_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ZKOOL_GRAPHQL_URL"],
        message: "ZKOOL_GRAPHQL_URL é obrigatório quando ZCASH_GATEWAY=zkool",
      });
    }
  });

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Configuração inválida (variáveis de ambiente):\n${issues}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Credenciais RPC normalizadas para um endpoint JSON-RPC. */
export interface RpcEndpoint {
  readonly url: string;
  readonly user?: string;
  readonly password?: string;
}

/** Endpoint GraphQL (zkool) com JWT opcional. */
export interface GraphQLEndpoint {
  readonly url: string;
  readonly token?: string;
}

export function getZebraEndpoint(): RpcEndpoint | null {
  const env = getEnv();
  if (!env.ZEBRA_RPC_URL) return null;
  return {
    url: env.ZEBRA_RPC_URL,
    user: env.ZEBRA_RPC_USER,
    password: env.ZEBRA_RPC_PASSWORD,
  };
}

export function getZalletEndpoint(): RpcEndpoint | null {
  const env = getEnv();
  if (!env.ZALLET_RPC_URL) return null;
  return {
    url: env.ZALLET_RPC_URL,
    user: env.ZALLET_RPC_USER,
    password: env.ZALLET_RPC_PASSWORD,
  };
}

export function getZalletAccountUuid(): string | undefined {
  return getEnv().ZALLET_ACCOUNT_UUID;
}

export function getZkoolEndpoint(): GraphQLEndpoint | null {
  const env = getEnv();
  if (!env.ZKOOL_GRAPHQL_URL) return null;
  return { url: env.ZKOOL_GRAPHQL_URL, token: env.ZKOOL_JWT_TOKEN };
}
