import { Badge, Card } from "@/components/ui";
import { getIsAdmin } from "@/lib/auth/admin";
import {
  type Election,
  currentElection,
  getElections,
} from "@/lib/zcg/governance-repo";
import { cn } from "@/lib/utils";
import {
  type ElectionForm,
  ElectionControls,
  NewElectionButton,
} from "./governance-admin";

function fmt(iso?: string | null): string {
  if (!iso) return "·";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysLeft(iso?: string | null): number | null {
  if (!iso) return null;
  const end = new Date(`${iso}T20:00:00Z`).getTime();
  return Math.ceil((end - Date.now()) / 86_400_000);
}

function toForm(e: Election): ElectionForm {
  return {
    title: e.title,
    status: e.status,
    seats: String(e.seats),
    url: e.url,
    nominationsClose: e.nominationsClose ?? "",
    communityCall: e.communityCall ?? "",
    votingCloses: e.votingCloses ?? "",
    resultsBy: e.resultsBy ?? "",
    elected: (e.elected ?? []).join(", "),
    note: e.note ?? "",
  };
}

function KeyDate({
  label,
  value,
  state = "todo",
}: {
  label: string;
  value: string;
  state?: "done" | "active" | "todo";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        state === "active"
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : "border-stone-200 bg-white",
      )}
    >
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-stone-500">
        {state === "done" ? (
          <span className="text-emerald-600">✓</span>
        ) : state === "active" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        ) : null}
        {label}
      </p>
      <p className="mt-0.5 text-xs font-medium text-stone-800 tnum">{value}</p>
    </div>
  );
}

export async function ElectionsSection() {
  const [isAdmin, elections] = await Promise.all([
    getIsAdmin(),
    getElections(),
  ]);
  const current = currentElection(elections);
  const past = elections.filter((e) => e.status === "closed");
  const left = current ? daysLeft(current.votingCloses) : null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-700">
          Committee elections
        </h2>
        {isAdmin ? <NewElectionButton /> : null}
      </div>

      {current ? (
        <Card className="border-amber-500/25 bg-gradient-to-br from-amber-500/[0.06] to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="emerald">● Voting open</Badge>
                <p className="text-sm font-semibold text-stone-900">
                  {current.title}
                </p>
                <span className="text-xs text-stone-500">
                  {current.seats} seats
                </span>
                {isAdmin ? (
                  <ElectionControls id={current.id} initial={toForm(current)} />
                ) : null}
              </div>
              {current.note ? (
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-stone-500">
                  {current.note}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
                Voting closes
              </p>
              <p className="text-lg font-semibold text-stone-900 tnum">
                {fmt(current.votingCloses)}
              </p>
              {left != null && left >= 0 ? (
                <p className="text-xs font-medium text-amber-700">
                  {left} day{left === 1 ? "" : "s"} left · 20:00 UTC
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <KeyDate
              label="Nominations"
              value={fmt(current.nominationsClose)}
              state="done"
            />
            <KeyDate
              label="Community call"
              value={fmt(current.communityCall)}
              state="done"
            />
            <KeyDate
              label="Voting closes"
              value={fmt(current.votingCloses)}
              state="active"
            />
            <KeyDate label="Results by" value={fmt(current.resultsBy)} />
          </div>

          <div className="mt-4">
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/20 transition hover:bg-amber-400"
            >
              View election & vote on the forum ↗
            </a>
          </div>
        </Card>
      ) : null}

      {past.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
            Past elections
          </p>
          {past.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm transition hover:border-stone-300 hover:bg-stone-50"
            >
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium text-stone-900">{e.title}</span>
                  <span className="text-xs text-stone-500">
                    {e.seats} seats
                  </span>
                </span>
                <span className="truncate text-xs text-stone-500">
                  {e.elected ? `Elected: ${e.elected.join(", ")}` : "Results ↗"}
                </span>
              </a>
              {isAdmin ? (
                <ElectionControls id={e.id} initial={toForm(e)} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
