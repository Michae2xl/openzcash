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
 * RSS feed of ZecHub DAO treasury changes only (new payouts recorded on the
 * dashboard) — the ZCG spreadsheet feed lives at /api/feeds/zcg.xml.
 */
export async function GET() {
  const entries = await listChangelog(30, 50, "zechub").catch(() => []);

  const items = entries
    .map(
      (c) => `    <item>
      <title>${esc(`Payout: ${c.title}${c.detail ? ` (${c.detail})` : ""}`)}</title>
      <link>${SITE}/zechub</link>
      <guid isPermaLink="false">${c.id}</guid>
      <pubDate>${c.at.toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenZcash · ZecHub DAO treasury</title>
    <link>${SITE}/zechub</link>
    <description>New payouts recorded on the ZecHub DAO treasury dashboard, mirrored every 6 hours.</description>
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
