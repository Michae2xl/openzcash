import { Card, PageHeader, Stat } from "@/components/ui";
import { listGrants } from "@/lib/zcg/grants-repo";
import { listProposals, proposalsFunnel } from "@/lib/zcg/proposals-repo";
import { getLinks } from "@/lib/zcg/governance-repo";
import { disbStatusLabel, formatUsdCents } from "@/lib/zcg/format";
import {
  FpfGrantsTable,
  FpfProposalsTable,
  type GrantTableRow,
  type ProposalTableRow,
} from "./fpf-tables";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "FPF · Coinholder Grants · ZBO",
};

const GRANT_STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  cancelled: "Cancelled",
  open: "Open",
  keyholder_veto: "Keyholder veto",
  funds_returned: "Funds returned",
};

const PROPOSAL_VERDICT_LABEL: Record<string, string> = {
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
  filtered: "Not considered",
  under_review: "Under review",
  pending: "Pending vote",
  vetoed: "Keyholder veto",
};

function grantStatusLabel(status: string | null): string {
  if (!status) return "·";
  return GRANT_STATUS_LABEL[status] ?? disbStatusLabel(status);
}

export default async function FpfCoinholderGrantsPage() {
  const [grants, proposals, funnel, links] = await Promise.all([
    listGrants({ program: "coinholder" }),
    listProposals({ program: "coinholder" }),
    proposalsFunnel(),
    getLinks(),
  ]);
  const proposalFpf = links.proposal_fpf ?? "#";
  const cryptpadMilestone = links.cryptpad_milestone ?? "#";

  // Paid USD restricted to the coinholder grants shown here.
  const coinholderPaidCents = grants.reduce((acc, g) => acc + g.usdCents, 0n);
  const coinholderProposalCount =
    funnel.byProgram.find((p) => p.program === "coinholder")?.count ??
    proposals.length;

  const grantRows: GrantTableRow[] = grants.map((g) => ({
    grantKey: g.grantKey,
    grantee: g.grantee,
    category: g.category ?? "·",
    status: g.status,
    statusLabel: grantStatusLabel(g.status),
    _usd: Number(g.usdCents),
  }));

  const proposalRows: ProposalTableRow[] = proposals.map((p) => ({
    id: p.id,
    title: p.title,
    applicant: p.applicantsRaw ?? "·",
    status: p.status,
    verdictLabel: PROPOSAL_VERDICT_LABEL[p.status] ?? p.status,
    platformLink: p.platformLink,
    _usd: p.requestedUsdCents == null ? 0 : Number(p.requestedUsdCents),
  }));

  return (
    <>
      <PageHeader
        title="FPF · Coinholder Grants"
        subtitle="Retroactive grants directed by coinholder vote, not by a committee. Run by the Financial Privacy Foundation on a quarterly cadence."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={proposalFpf}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 px-3.5 py-2 text-sm font-medium text-stone-900 shadow-sm shadow-amber-900/30 transition hover:bg-amber-400"
            >
              Submit a proposal ↗
            </a>
            <a
              href={cryptpadMilestone}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-stone-400 hover:bg-stone-50"
            >
              Submit a milestone ↗
            </a>
          </div>
        }
      />

      <Card className="mb-8">
        <p className="text-sm leading-relaxed text-stone-600">
          The Financial Privacy Foundation administers a separate, coinholder
          directed grants program. The cycle runs end to end: a proposal is
          opened on GitHub, the FPF handles vetting and compliance (KYC is
          required above US$50k), coinholders then vote, and approved work is
          paid as a retroactive grant. This universe is distinct from the
          regular ZCG track.
        </p>
      </Card>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat
          label="Grants"
          value={String(grants.length)}
          sub="coinholder directed"
        />
        <Stat
          label="Total paid"
          value={formatUsdCents(coinholderPaidCents, { compact: true })}
          sub="USD across coinholder grants"
        />
        <Stat
          label="Proposals"
          value={String(coinholderProposalCount)}
          sub="submitted to the program"
          tone="warn"
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Coinholder grants
        </h2>
        <Card className="p-4">
          <FpfGrantsTable grantRows={grantRows} />
        </Card>
        <p className="mt-3 text-xs text-stone-500">
          {grants.length} grants · one approved project per row · amounts in USD
          with ZEC equivalents tracked in the ledger.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Coinholder proposals
        </h2>
        <Card className="p-4">
          <FpfProposalsTable proposalRows={proposalRows} />
        </Card>
        <p className="mt-3 text-xs text-stone-500">
          {proposals.length} proposals · the pipeline upstream of the grants
          above · only approved proposals become paid grants.
        </p>
      </section>
    </>
  );
}
