export const dynamic = "force-dynamic";

/**
 * Top-level public API index. `/api/zcg` documents the grants endpoints only,
 * so anyone typing the root URL used to land on a 404: this lists everything
 * the site exposes, grouped by subject, and points at the per-area indexes.
 */
export async function GET() {
  return Response.json(
    {
      name: "OpenZcash public API",
      readOnly: true,
      docs: "https://openzcash.org/zcg/methodology",
      endpoints: {
        grants: {
          "/api/zcg": "Grants API index, with the filters each endpoint takes.",
          "/api/zcg/data/grants":
            "Per-grant aggregation: milestones, paid, status. ?format=csv supported.",
          "/api/zcg/data/disbursements":
            "Payment ledger, one row per milestone payment. Filters: sheet, grant, category, type, search, limit. ?format=csv supported.",
          "/api/zcg/data/recipients":
            "Per-recipient totals in USD and ZEC. ?format=csv supported.",
          "/api/zcg/office": "Proposals currently under review.",
          "/api/zcg/coinholder/round":
            "The open Coinholder-Directed Retroactive Grants round: proposals, requested amounts, key dates, ballot options.",
        },
        zechub: {
          "/api/zechub/treasury":
            "ZecHub DAO treasury: the three pots, allocations and payouts, with the ZEC price used at snapshot time.",
        },
        chain: {
          "/api/chain-tip": "Current Zcash block height.",
        },
        feeds: {
          "/api/feeds/zcg.xml": "ZCG activity as RSS.",
          "/api/feeds/zechub.xml": "ZecHub treasury payouts as RSS.",
          "/api/feeds/meetings.ics":
            "Committee meetings as an iCalendar subscription.",
        },
      },
      notes: [
        "Read-only and unauthenticated. Amounts are in USD (dollars) and ZEC.",
        "Grant figures mirror the official ZCG spreadsheet: `usd` is budgeted, `zec` is what actually moved.",
        "List endpoints return { count, total, data }: when total exceeds count the response was capped, so raise ?limit.",
      ],
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
