/* eslint-disable @next/next/no-img-element */
import { Badge, Card, PageHeader } from "@/components/ui";
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

/** GitHub octocat mark (official path, monochrome). */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        fill="#24292f"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
      />
    </svg>
  );
}

/** Simplified Google Sheets glyph (green document with a white grid). */
function SheetsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        fill="#188038"
        d="M3.5 0h6L14 4.5V14a2 2 0 0 1-2 2H3.5a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2Z"
      />
      <path fill="#8fd0a9" d="M9.5 0 14 4.5H9.5V0Z" />
      <path
        fill="#fff"
        d="M4.5 7h7v6h-7V7Zm1.2 1.2v1h1.9v-1H5.7Zm3.2 0v1h1.9v-1H8.9Zm-3.2 2.2v1h1.9v-1H5.7Zm3.2 0v1h1.9v-1H8.9Z"
      />
    </svg>
  );
}

/** Each source shows its real brand mark, all served locally (strict CSP). */
const SOURCE: Record<NewsSource, { label: string; logo: React.ReactNode }> = {
  forum: {
    label: "Forum",
    logo: <img src="/zcash-mark.svg" alt="" className="h-6 w-6" />,
  },
  github: {
    label: "GitHub",
    logo: <GitHubMark className="h-5 w-5" />,
  },
  sheet: {
    label: "Spreadsheet",
    logo: <SheetsMark className="h-5 w-5" />,
  },
  proposal: {
    label: "Proposal",
    logo: (
      <img
        src="/logos/zcg.png"
        alt=""
        className="h-5 w-5 rounded object-contain"
      />
    ),
  },
  dao: {
    label: "ZecHub DAO",
    logo: (
      <img
        src="/logos/zechub.png"
        alt=""
        className="h-5 w-5 rounded object-contain"
      />
    ),
  },
  application: {
    label: "Application",
    logo: (
      <img
        src="/logos/zcg.png"
        alt=""
        className="h-5 w-5 rounded object-contain"
      />
    ),
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
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-inset ring-stone-200">
                {s.logo}
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
