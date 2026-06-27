import { Badge, Card, PageHeader } from "@/components/ui";
import { IconNews, IconUsers } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zcash Foundation · OpenZcash" };

const FORUM_CATEGORY =
  "https://forum.zcashcommunity.com/c/ecosystem-updates/foundation/21";

type Report = { title: string; date: string; url: string; kind: string };

// Zcash Foundation transparency reports, straight from the community forum.
const REPORTS: Report[] = [
  {
    title: "Q1 2026 Report",
    date: "2026-05-19",
    kind: "Quarterly report",
    url: "https://forum.zcashcommunity.com/t/zcash-foundation-q1-2026-report/55732",
  },
  {
    title: "Q4 2025 Report",
    date: "2026-02-27",
    kind: "Quarterly report",
    url: "https://forum.zcashcommunity.com/t/zcash-foundation-q4-2025-report/54829",
  },
  {
    title: "2025 Year in Review",
    date: "2026-01-28",
    kind: "Annual review",
    url: "https://forum.zcashcommunity.com/t/zcash-foundation-2025-year-in-review/54401",
  },
  {
    title: "Q2 and Q3 2024 Quarterly Reports",
    date: "2024-10-01",
    kind: "Quarterly report",
    url: "https://forum.zcashcommunity.com/t/zcash-foundation-s-quarterly-reports-for-q2-and-q3-2024/50110",
  },
  {
    title: "Q2 2023 Quarterly Report",
    date: "2023-07-01",
    kind: "Quarterly report",
    url: "https://forum.zcashcommunity.com/t/zcash-foundation-q2-2023-quarterly-report/45641",
  },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

type Zcon = {
  name: string;
  when: string;
  location: string;
  url: string;
  theme?: string;
  upcoming?: boolean;
};

// The Zcon conference series, organized by the Zcash Foundation. Newest first.
const ZCONS: Zcon[] = [
  {
    name: "Zcon7",
    when: "Oct 27–29, 2026",
    location: "Cancún, Mexico",
    url: "https://zfnd.org/zcon7/",
    upcoming: true,
  },
  {
    name: "Zcon VI",
    when: "Mar 4–7, 2025",
    location: "Virtual",
    url: "https://zfnd.org/zconvi/",
  },
  {
    name: "Zcon V",
    when: "Mar 6–10, 2024",
    location: "Virtual",
    theme: "Zcash: Unified",
    url: "https://zfnd.org/zconv/",
  },
  {
    name: "Zcon IV",
    when: "Jul 30–Aug 1, 2023",
    location: "Barcelona, Spain",
    theme: "The Future Has Not Been Written",
    url: "https://zfnd.org/zcon4/",
  },
  {
    name: "Zcon3",
    when: "Aug 7–9, 2022",
    location: "Las Vegas, USA",
    theme: "Code Alone Doesn't Cut It",
    url: "https://zfnd.org/zcon3-3/",
  },
  {
    name: "Zcon2",
    when: "2021",
    location: "Virtual",
    url: "https://zfnd.org/zcon/",
  },
  {
    name: "Zcon1",
    when: "Jun 2019",
    location: "Split, Croatia",
    url: "https://zfnd.org/zcon/",
  },
  {
    name: "Zcon0",
    when: "Jun 26–28, 2018",
    location: "Montréal, Canada",
    url: "https://zfnd.org/zcon0/",
  },
];

export default function ZfPage() {
  const reports = [...REPORTS].sort((a, b) => b.date.localeCompare(a.date));
  const latest = reports[0];

  return (
    <>
      <PageHeader
        title="Zcash Foundation"
        subtitle="The Zcash Foundation's quarterly transparency reports and the Zcon conference series — engineering, finances, activities and community, straight from the source."
        actions={
          <a
            href={FORUM_CATEGORY}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
          >
            Foundation on the forum ↗
          </a>
        }
      />

      <a
        href={FORUM_CATEGORY}
        target="_blank"
        rel="noreferrer"
        className="block"
      >
        <Card interactive className="mb-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
            Community forum
          </p>
          <p className="mt-1 text-sm font-medium text-stone-900">
            Zcash Foundation category
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Full archive of Foundation reports, updates and announcements.
          </p>
        </Card>
      </a>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
        Transparency reports
        {latest ? (
          <Badge tone="amber">newest {formatDate(latest.date)}</Badge>
        ) : null}
      </h2>

      <Card className="space-y-1 p-2">
        {reports.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-100"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
              <IconNews className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-900">{r.title}</p>
              <p className="truncate text-xs text-stone-600">{r.kind}</p>
            </div>
            <span className="shrink-0 text-xs text-stone-600 tnum">
              {formatDate(r.date)}
            </span>
          </a>
        ))}
      </Card>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold text-stone-700">
        Zcon conferences
        <Badge tone="amber">next · Zcon7 · Cancún</Badge>
      </h2>

      <Card className="space-y-1 p-2">
        {ZCONS.map((z) => (
          <a
            key={z.name}
            href={z.url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-100 ${
              z.upcoming
                ? "bg-amber-500/[0.07] ring-1 ring-inset ring-amber-500/25"
                : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
              <IconUsers className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-stone-900">
                {z.name}
                {z.upcoming ? <Badge tone="amber">Upcoming</Badge> : null}
              </p>
              <p className="truncate text-xs text-stone-600">
                {z.location}
                {z.theme ? ` · “${z.theme}”` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs text-stone-600 tnum">
              {z.when}
            </span>
          </a>
        ))}
      </Card>
    </>
  );
}
