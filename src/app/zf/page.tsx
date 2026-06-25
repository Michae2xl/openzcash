import { Badge, Card, PageHeader } from "@/components/ui";
import { IconNews } from "@/components/icons";

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

export default function ZfPage() {
  const reports = [...REPORTS].sort((a, b) => b.date.localeCompare(a.date));
  const latest = reports[0];

  return (
    <>
      <PageHeader
        title="Zcash Foundation"
        subtitle="The Zcash Foundation's quarterly transparency reports and updates — engineering, finances and activities — straight from the community forum."
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
    </>
  );
}
