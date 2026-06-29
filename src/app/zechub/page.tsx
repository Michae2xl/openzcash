import { Badge, Card, PageHeader, Stat } from "@/components/ui";
import {
  getZechubProposals,
  ZECHUB_DAO_URL,
  type ZechubProposal,
} from "@/lib/dao/zechub";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZecHub DAO · OpenZcash" };

function statusTone(status: string): "emerald" | "rose" | "amber" | "zinc" {
  if (status === "executed" || status === "passed") return "emerald";
  if (status === "open") return "amber";
  if (
    status === "rejected" ||
    status === "closed" ||
    status === "execution_failed"
  )
    return "rose";
  return "zinc";
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(iso: string): string {
  if (!iso) return "·";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "·";
  return new Date(t).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProposalRow({ p }: { p: ZechubProposal }) {
  const total = p.yes + p.no + p.abstain;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-start justify-between gap-3 px-5 py-3.5 transition hover:bg-amber-500/[0.06]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded bg-stone-100 px-1.5 py-px font-mono text-[11px] text-stone-500 ring-1 ring-inset ring-stone-200">
            {p.ref}
          </span>
          <span className="truncate text-sm font-medium text-stone-900">
            {p.title}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
          <span>{fmtDate(p.createdAt)}</span>
          {total > 0 ? (
            <span className="tnum">
              <span className="text-emerald-700">{p.yes} yes</span> ·{" "}
              <span className="text-rose-600">{p.no} no</span>
              {p.abstain > 0 ? ` · ${p.abstain} abstain` : ""}
            </span>
          ) : null}
        </div>
      </div>
      <Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge>
    </a>
  );
}

export default async function ZechubDaoPage() {
  const proposals = await getZechubProposals(40);
  const openCount = proposals.filter((p) => p.status === "open").length;
  const passedCount = proposals.filter(
    (p) => p.status === "passed" || p.status === "executed",
  ).length;

  return (
    <>
      <PageHeader
        title="ZecHub DAO"
        subtitle="ZecHub governs itself on-chain as a DAO on Juno (DAO DAO). These are its latest proposals — sponsorships, grants and community initiatives decided by member vote. Read-only mirror of daodao.zone."
        actions={
          <a
            href={`${ZECHUB_DAO_URL}/proposals`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
          >
            daodao.zone ↗
          </a>
        }
      />

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="Recent proposals"
          value={String(proposals.length)}
          sub="newest first"
        />
        <Stat
          label="Open now"
          value={String(openCount)}
          sub="voting in progress"
          tone="warn"
        />
        <Stat
          label="Passed / executed"
          value={String(passedCount)}
          sub="of those shown"
        />
      </section>

      {proposals.length > 0 ? (
        <Card className="p-0">
          <p className="border-b border-stone-200 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-stone-600">
            Latest proposals
          </p>
          <div className="divide-y divide-stone-200">
            {proposals.map((p) => (
              <ProposalRow key={p.id} p={p} />
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-stone-600">
            Proposals are temporarily unavailable — the DAO DAO indexer did not
            respond. Try again shortly, or open{" "}
            <a
              href={`${ZECHUB_DAO_URL}/proposals`}
              target="_blank"
              rel="noreferrer"
              className="text-amber-700 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-800"
            >
              the DAO on daodao.zone ↗
            </a>
            .
          </p>
        </Card>
      )}

      <p className="mt-3 text-xs text-stone-500">
        Showing the {proposals.length} most recent of ZecHub&apos;s on-chain
        proposals · click any row to open it on DAO DAO.
      </p>
    </>
  );
}
