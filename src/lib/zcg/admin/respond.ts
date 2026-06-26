/** Shared helpers for the admin write routes. */

export function fail(e: unknown): Response {
  // Log the real error server-side; these are admin (auth-gated) routes, so the
  // operator still gets the message, but full stacks/details stay in the logs.
  console.error("[admin] request failed:", e);
  return Response.json(
    { ok: false, error: e instanceof Error ? e.message : String(e) },
    { status: 400 },
  );
}

export function clean(s: string | null | undefined): string | null {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
}
