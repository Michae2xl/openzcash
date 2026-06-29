import { Badge, Card, PageHeader } from "@/components/ui";
import { IconGrid, IconNews, IconReceipt, IconVote } from "@/components/icons";
import {
  getNews,
  nowMs,
  type NewsItem,
  type NewsSource,
} from "@/lib/news/feed";
import { NewsSeen } from "@/components/news-seen";

export const dynamic = "force-dynamic";
export const metadata = { title: "News · OpenZcash" };

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

const SOURCE: Record<
  NewsSource,
  {
    label: string;
    chip: string;
    Icon: (p: { className?: string }) => React.ReactNode;
  }
> = {
  // Forum stays neutral; spreadsheet and proposals each get their own colour.
  forum: {
    label: "Forum",
    chip: "bg-stone-400/15 text-stone-500",
    Icon: IconNews,
  },
  github: {
    label: "GitHub",
    chip: "bg-sky-500/10 text-sky-700",
    Icon: IconGrid,
  },
  sheet: {
    label: "Spreadsheet",
    chip: "bg-amber-500/15 text-amber-700",
    Icon: IconReceipt,
  },
  proposal: {
    label: "Proposal",
    chip: "bg-violet-500/15 text-violet-700",
    Icon: IconVote,
  },
  dao: {
    label: "ZecHub DAO",
    chip: "bg-teal-500/15 text-teal-700",
    Icon: IconVote,
  },
};

function rel(ts: string, now: number): string {
  const d = Math.floor((now - Date.parse(ts)) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.floor(d / 365)}y ago`;
}

export default async function NewsPage() {
  const items = await getNews();
  const latest = items[0]?.ts ?? "";
  const now = nowMs();
  const newCut = now - NEW_WINDOW_MS;
  const newCount = items.filter((i) => Date.parse(i.ts) > newCut).length;

  return (
    <>
      <NewsSeen latest={latest} />
      <PageHeader
        title="News"
        subtitle="What's new across the Zcash ecosystem — community forum, core GitHub releases, and the latest ZCG spreadsheet entries. Forum and GitHub are live; spreadsheet rows follow the daily mirror."
        actions={
          newCount > 0 ? (
            <Badge tone="rose">{newCount} new · 48h</Badge>
          ) : undefined
        }
      />

      <Card className="space-y-1 p-2">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-stone-500">
            No recent activity — sources may be momentarily unreachable.
          </p>
        ) : null}
        {items.map((i: NewsItem) => {
          const s = SOURCE[i.source];
          const isNew = Date.parse(i.ts) > newCut;
          const external = i.url.startsWith("http");
          return (
            <a
              key={`${i.source}:${i.url}`}
              href={i.url}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-100"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.chip}`}
              >
                <s.Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-stone-900">
                  <span className="truncate">{i.title}</span>
                  {isNew ? (
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  ) : null}
                </p>
                <p className="truncate text-xs text-stone-600">
                  {i.source === "proposal" || i.source === "github"
                    ? i.kind
                    : s.label}
                </p>
              </div>
              <span className="shrink-0 text-xs text-stone-500 tnum">
                {rel(i.ts, now)}
              </span>
            </a>
          );
        })}
      </Card>
    </>
  );
}
