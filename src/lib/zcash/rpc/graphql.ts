/**
 * Cliente GraphQL minimalista (para o servidor zkool-graphql).
 * JWT opcional (Bearer), timeout via AbortController, erros explícitos.
 */

import type { GraphQLEndpoint } from "@/lib/config/env";

export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GraphQLRequestError";
  }
}

export async function gqlRequest<T = unknown>(
  endpoint: GraphQLEndpoint,
  query: string,
  variables: Record<string, unknown> = {},
  opts: { timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (endpoint.token) headers.authorization = `Bearer ${endpoint.token}`;

  let res: Response;
  try {
    res = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (cause) {
    throw new GraphQLRequestError(
      `Falha ao conectar no zkool-graphql em ${endpoint.url}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      cause,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new GraphQLRequestError(`HTTP ${res.status} de ${endpoint.url}`);
  }

  const payload = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (payload.errors?.length) {
    throw new GraphQLRequestError(
      payload.errors.map((e) => e.message).join("; "),
    );
  }
  return payload.data as T;
}
