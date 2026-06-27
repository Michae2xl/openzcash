/**
 * GET /api/news/summary?since=<ISO> — public. Returns how many news items are
 * newer than the caller's last-seen timestamp, for the launcher's red badge.
 */
import { getNews, unreadCount } from "@/lib/news/feed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const since = new URL(req.url).searchParams.get("since");
  const items = await getNews();
  return Response.json({
    unread: unreadCount(items, since),
    latest: items[0]?.ts ?? null,
    total: items.length,
  });
}
