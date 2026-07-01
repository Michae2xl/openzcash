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

/** Respond as CSV when `?format=csv`, otherwise JSON. Cached at the edge 5 min. */
export function dataResponse(
  rows: Row[],
  format: string | null,
  filename: string,
): Response {
  const cache = "public, max-age=300";
  if (format === "csv") {
    return new Response(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}.csv"`,
        "cache-control": cache,
      },
    });
  }
  return Response.json(
    { count: rows.length, data: rows },
    { headers: { "cache-control": cache } },
  );
}
