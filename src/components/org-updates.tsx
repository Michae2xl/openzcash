import type { OrgUpdate, UpdateKind } from "@/lib/org-updates/forum";

/**
 * Live list of an organization's forum updates, grouped visually by kind.
 * Shared by /zf and /shielded-labs so both read the same way.
 */

const KIND_LABEL: Record<UpdateKind, string> = {
  engineering: "Engineering",
  release: "Release",
  report: "Report",
  announcement: "Announcement",
};

const KIND_TONE: Record<UpdateKind, string> = {
  engineering: "bg-sky-500/10 text-sky-800 ring-sky-500/25",
  release: "bg-emerald-500/10 text-emerald-800 ring-emerald-500/25",
  report: "bg-amber-500/10 text-amber-800 ring-amber-500/25",
  announcement: "bg-stone-100 text-stone-700 ring-stone-200",
};

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function OrgUpdates({
  updates,
  title,
  sourceUrl,
  sourceLabel,
  empty,
}: {
  updates: OrgUpdate[];
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ring-1 ring-inset ring-stone-900/5">
      <div className="flex items-baseline justify-between gap-3 border-b border-stone-200 px-5 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-600">
          {title}
        </p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-amber-700 hover:underline"
        >
          {sourceLabel}
        </a>
      </div>
      {updates.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-stone-600">{empty}</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {updates.map((u) => (
            <li key={u.id}>
              <a
                href={u.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-amber-500/[0.05]"
              >
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${KIND_TONE[u.kind]}`}
                >
                  {KIND_LABEL[u.kind]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-stone-800">
                  {u.title}
                </span>
                {u.replies > 0 ? (
                  <span className="hidden shrink-0 text-[11px] text-stone-500 tnum sm:inline">
                    {u.replies} {u.replies === 1 ? "reply" : "replies"}
                  </span>
                ) : null}
                <span className="shrink-0 text-[11px] text-stone-600 tnum">
                  {fmt(u.date)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
