import { Badge, Card, PageHeader } from "@/components/ui";
import { IconGrid } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Z3 stack · OpenZcash" };

const DEPRECATION = "https://z.cash/support/zcashd-deprecation/";
const FORUM =
  "https://forum.zcashcommunity.com/t/zcash-z3-updates-formerly-zcashd-deprecation/48965";

type Component = {
  name: string;
  role: string;
  status: string;
  tone: "amber" | "emerald" | "zinc";
  org: string;
  repo: string;
};

// The Z3 stack — the modular Rust successor to the monolithic zcashd node.
const COMPONENTS: Component[] = [
  {
    name: "Zebra",
    role: "Consensus full node (zebrad) — an independent Rust implementation of the Zcash protocol. The validating node that replaces zcashd's consensus.",
    status: "Production",
    tone: "emerald",
    org: "Zcash Foundation",
    repo: "https://github.com/ZcashFoundation/zebra",
  },
  {
    name: "Zaino",
    role: "Indexing & lightwallet service — the gRPC/JSON-RPC layer that serves wallets, taking over the role lightwalletd played for zcashd.",
    status: "Feature-complete",
    tone: "amber",
    org: "Zingo Labs",
    repo: "https://github.com/zingolabs/zaino",
  },
  {
    name: "Zallet",
    role: "Full-node wallet — the wallet daemon and RPCs that replace zcashd's built-in wallet, paired with Zebra + Zaino.",
    status: "Alpha",
    tone: "amber",
    org: "Electric Coin Co",
    repo: "https://github.com/zcash/wallet",
  },
];

export default function Z3Page() {
  return (
    <>
      <PageHeader
        title="Z3 · the zcashd successor"
        subtitle="zcashd is deprecated. The Z3 stack — Zebra + Zaino + Zallet — is its modular Rust replacement: a validating node, an indexing/lightwallet service, and a wallet, run together. This is the infrastructure much of the Dev Fund and ZCG spend is building toward."
        actions={
          <a
            href={FORUM}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-700 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/25"
          >
            Z3 updates on the forum ↗
          </a>
        }
      />

      <a href={DEPRECATION} target="_blank" rel="noreferrer" className="block">
        <Card interactive className="mb-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-stone-600">
            Official
          </p>
          <p className="mt-1 text-sm font-medium text-stone-900">
            zcashd deprecation &amp; migration guide
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Why zcashd is being retired and how the ecosystem moves to the Z3
            stack.
          </p>
        </Card>
      </a>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-700">
        <IconGrid className="h-4 w-4 text-amber-600" />
        The stack
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {COMPONENTS.map((c) => (
          <a
            key={c.name}
            href={c.repo}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Card interactive className="h-full">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-stone-900">
                  {c.name}
                </p>
                <Badge tone={c.tone}>{c.status}</Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {c.role}
              </p>
              <p className="mt-3 text-[11px] uppercase tracking-wider text-stone-500">
                {c.org} · GitHub ↗
              </p>
            </Card>
          </a>
        ))}
      </div>
    </>
  );
}
