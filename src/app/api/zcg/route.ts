export const dynamic = "force-dynamic";

/** Public, read-only API index. Everything this site renders is queryable. */
export async function GET() {
  return Response.json({
    name: "OpenZcash public API",
    readOnly: true,
    endpoints: {
      "/api/zcg/data/disbursements":
        "Disbursement ledger. Filters: sheet, grant, category, type, search, limit. ?format=csv for CSV.",
      "/api/zcg/data/recipients":
        "Per-recipient totals (USD + ZEC). ?format=csv for CSV.",
      "/api/zcg/data/grants":
        "Per-grant aggregation (milestones, paid, status). ?format=csv for CSV.",
    },
    notes:
      "Amounts are in USD (dollars) and ZEC. Mirrored from the ZCG public spreadsheet; see /zcg/methodology.",
  });
}
