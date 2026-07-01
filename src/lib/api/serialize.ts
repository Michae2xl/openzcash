import { gzipSync } from "node:zlib";

/** Serialization helpers for the public read-only API (JSON or CSV). */

type Row = Record<string, unknown>;

export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}

/**
 * Respond as CSV when `?format=csv`, otherwise JSON. Browser-cached 5 min.
 * Gzips the body itself when the caller passes the request and the client
 * accepts it — these payloads run to ~1MB and Next's built-in compression
 * does not cover route-handler responses.
 */
export function dataResponse(
  rows: Row[],
  format: string | null,
  filename: string,
  req?: Request,
): Response {
  const isCsv = format === "csv";
  const body = isCsv
    ? toCsv(rows)
    : JSON.stringify({ count: rows.length, data: rows });

  const headers: Record<string, string> = {
    "content-type": isCsv
      ? "text/csv; charset=utf-8"
      : "application/json; charset=utf-8",
    "cache-control": "public, max-age=300",
    vary: "accept-encoding",
  };
  if (isCsv)
    headers["content-disposition"] = `attachment; filename="${filename}.csv"`;

  const wantsGzip =
    req?.headers.get("accept-encoding")?.toLowerCase().includes("gzip") ??
    false;
  if (wantsGzip && body.length > 1024) {
    headers["content-encoding"] = "gzip";
    return new Response(new Uint8Array(gzipSync(body)), { headers });
  }
  return new Response(body, { headers });
}
