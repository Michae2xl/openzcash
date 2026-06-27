import { Badge, Card, PageHeader } from "@/components/ui";
import { IconShield } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shielded Labs · OpenZcash" };

const SITE = "https://shieldedlabs.net/";
const CROSSLINK = "https://shieldedlabs.net/crosslink/";
const NSM = "https://shieldedlabs.net/nsm/";
const ROADMAP = "https://shieldedlabs.net/roadmap/";
const GITHUB = "https://github.com/ShieldedLabs";

type Zip = { id: string; title: string; desc: string; url: string };

// The Network Sustainability Mechanism — three ZEC supply-economics ZIPs.
const ZIPS: Zip[] = [
  {
    id: "ZIP 233",
    title: "Burning",
    desc: "A protocol mechanism to permanently remove ZEC from circulation, via voluntary contributions or protocol fees.",
    url: "https://zips.z.cash/zip-0233",
  },
  {
    id: "ZIP 234",
    title: "Issuance Smoothing",
    desc: "An issuance smoothing curve that reissues burned ZEC over time instead of relying only on the four-year halving, stabilizing miner revenue.",
    url: "https://zips.z.cash/zip-0234",
  },
  {
    id: "ZIP 235",
    title: "Fee Burning",
    desc: "Burns 60% of transaction fees to add deflationary pressure during periods of high network usage.",
    url: "https://zips.z.cash/zip-0235",
  },
];

export default function ShieldedLabsPage() {
  return (
    <>
      <PageHeader
        title="Shielded Labs"
        subtitle="An independent, donation-funded Zcash organization — the first that has never taken Development Fund or block-reward money. It drives two protocol-economics efforts: Crosslink (hybrid Proof-of-Stake) and the Network Sustainability Mechanism."
        actions={
          <a
            href={SITE}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
          >
            shieldedlabs.net ↗
          </a>
        }
      />

      <a href={CROSSLINK} target="_blank" rel="noreferrer" className="block">
        <Card
          interactive
          className="mb-6 border-amber-500/20 bg-amber-500/[0.05]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-amber-700/80">
                <IconShield className="h-3.5 w-3.5" />
                Crosslink
              </p>
              <p className="mt-1.5 text-sm font-medium text-stone-900">
                Hybrid Proof-of-Work + Proof-of-Stake with BFT finality
              </p>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                Gives Zcash the combined security of PoW and PoS and lets people
                get paid to hold ZEC. PoW and BFT finality are integrated;
                staking &amp; tokenomics are in development, with hardening and
                productionization (final ZIPs + audits) slated for 2026.
              </p>
            </div>
            <Badge tone="amber">Milestone 4</Badge>
          </div>
        </Card>
      </a>

      <h2 className="mb-1 text-sm font-semibold text-stone-700">
        Network Sustainability Mechanism (NSM)
      </h2>
      <p className="mb-3 text-xs text-stone-600">
        Three proposed changes to ZEC supply economics.{" "}
        <a
          href={NSM}
          target="_blank"
          rel="noreferrer"
          className="text-amber-700 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-800"
        >
          Overview ↗
        </a>
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {ZIPS.map((z) => (
          <a
            key={z.id}
            href={z.url}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Card interactive className="h-full">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-900">
                  {z.title}
                </p>
                <Badge tone="zinc">{z.id}</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {z.desc}
              </p>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <a href={ROADMAP} target="_blank" rel="noreferrer" className="block">
          <Card interactive className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-900">Roadmap</span>
            <span className="text-xs text-stone-500">milestones ↗</span>
          </Card>
        </a>
        <a href={GITHUB} target="_blank" rel="noreferrer" className="block">
          <Card interactive className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-stone-900">GitHub</span>
            <span className="text-xs text-stone-500">ShieldedLabs ↗</span>
          </Card>
        </a>
      </div>
    </>
  );
}
