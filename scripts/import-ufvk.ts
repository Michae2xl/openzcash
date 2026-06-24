/**
 * Onboarding de auditoria: importa uma UFVK no zkool como conta WATCH-ONLY e sincroniza.
 *
 * Uso: npm run import-ufvk -- <UFVK> [nome] [birthHeight]
 *   - UFVK        : unified full viewing key (uview1...) da carteira de tesouraria
 *   - nome        : rótulo da conta (default "tesouraria")
 *   - birthHeight : altura inicial do trial-decryption (default 0 = desde o sapling
 *                   activation; informe a altura de criação da carteira p/ scan MUITO
 *                   mais rápido)
 *
 * Requer ZKOOL_GRAPHQL_URL no .env.local (ex.: http://localhost:8000/graphql).
 * Read-only: cria a conta como view-only (sem spend key) e só sincroniza.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

async function gql<T>(
  url: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "GraphQL error");
  }
  if (!json.data) throw new Error("resposta GraphQL sem data");
  return json.data;
}

async function main() {
  const url = process.env.ZKOOL_GRAPHQL_URL;
  if (!url) {
    throw new Error("ZKOOL_GRAPHQL_URL não configurado no .env.local");
  }

  const [ufvk, name = "tesouraria", birthStr = "0"] = process.argv.slice(2);
  if (!ufvk) {
    console.error("uso: npm run import-ufvk -- <UFVK> [nome] [birthHeight]");
    process.exit(1);
  }
  const birth = Number(birthStr);
  if (!Number.isInteger(birth) || birth < 0) {
    throw new Error(`birthHeight inválido: ${birthStr}`);
  }

  console.log(
    `Importando UFVK como conta watch-only "${name}" (birth=${birth})…`,
  );
  const { createAccount: id } = await gql<{ createAccount: number }>(
    url,
    `mutation ($a: NewAccount!) { createAccount(newAccount: $a) }`,
    { a: { name, key: ufvk, aindex: 0, birth, useInternal: false } },
  );
  console.log(`✓ conta criada: id_account = ${id}`);

  console.log("Sincronizando (tempo depende do birth)…");
  const { synchronize: height } = await gql<{ synchronize: number }>(
    url,
    `mutation ($ids: [Int!]!) { synchronize(idAccounts: $ids) }`,
    { ids: [id] },
  );
  console.log(`✓ sincronizado até a altura ${height}`);
  console.log(
    "\nPronto. Com ZCASH_GATEWAY=zkool, rode o scan do app (POST /api/scan).",
  );
}

main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
