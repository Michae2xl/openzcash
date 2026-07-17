import { listChangelog } from "@/lib/zcg/changelog";

export const dynamic = "force-dynamic";

const SITE = "https://openzcash.org";

const esc = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * RSS feed of the "what changed" audit trail: new proposals, verdict changes
 * and newly recorded payments, diffed daily from the official spreadsheet.
 */
export async function GET() {
  const entries = await listChangelog(30, 50).catch(() => []);

  const items = entries
    .map((c) => {
      const title =
        c.kind === "proposal_status"
          ? `${c.title}: ${c.fromVal ?? "?"} → ${c.toVal ?? "?"}`
          : c.kind === "proposal_new"
            ? `New proposal: ${c.title}`
            : `Payment recorded: ${c.title}${c.detail ? ` (${c.detail})` : ""}`;
      const link =
        c.kind === "payment"
          ? `${SITE}/zcg/disbursements`
          : `${SITE}/zcg/proposals`;
      return `    <item>
      <title>${esc(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${c.id}</guid>
      <pubDate>${c.at.toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenZcash · ZCG changes</title>
    <link>${SITE}/zcg</link>
    <description>Automatic diff of the official ZCG spreadsheet: new proposals, verdict changes, and newly recorded payments.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=900",
    },
  });
}
