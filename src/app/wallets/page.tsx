import { Badge, Card, PageHeader } from "@/components/ui";
import { IconShield } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zcash Wallets · OpenZcash" };

type Shielded = "full" | "partial" | "transparent";

interface Wallet {
  name: string;
  maker: string;
  url: string;
  platforms: string[];
  shielded: Shielded;
  note: string;
  flagship?: boolean;
  tag?: "Beta" | "Coming soon";
}

// Curated from official sources + a multi-agent research pass (2026), seeded by
// the community wallet list. Shielded support is the headline: "full" = send AND
// receive shielded (Orchard/Sapling); "partial" = limited; "transparent" = t-addr only.
const SOFTWARE: Wallet[] = [
  {
    name: "Zodl",
    maker: "Zcash Open Development Lab",
    url: "https://zodl.com",
    platforms: ["iOS", "Android"],
    shielded: "full",
    flagship: true,
    note: "Formerly Zashi — shielded by default with auto-shielding and encrypted memos, from the core team that kept building it after leaving ECC.",
  },
  {
    name: "Zingo!",
    maker: "Zingo Labs",
    url: "https://zingolabs.org/zingo/",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Open-source, shielded by default, with view-only UFVK import — handy for accounting and watch-only.",
  },
  {
    name: "Ywallet",
    maker: "hanh",
    url: "https://ywallet.app",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Fast warp sync and power-user controls; full shielded send/receive and an encrypted messenger.",
  },
  {
    name: "Brave Wallet",
    maker: "Brave Software",
    url: "https://brave.com/wallet/",
    platforms: ["Desktop", "iOS", "Android"],
    shielded: "full",
    note: "Built into the Brave browser; supports Transparent, Unified and Shielded ZEC accounts via zk-proofs.",
  },
  {
    name: "Noir Wallet",
    maker: "RHEA Finance",
    url: "https://www.zknoir.com/",
    platforms: ["Browser extension"],
    shielded: "full",
    note: "First browser-extension wallet to bring shielded ZEC together with native DeFi.",
  },
  {
    name: "Vizor",
    maker: "Chainapsis (Keplr)",
    url: "https://vizor.cash/",
    platforms: ["Desktop"],
    shielded: "full",
    note: "Open-source desktop wallet, shielded by default, with Keystone hardware support — from the team behind Keplr.",
  },
  {
    name: "Cake Wallet",
    maker: "Cake Labs",
    url: "https://cakewallet.com",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Multi-coin privacy wallet that auto-shields incoming funds and always sends from a shielded source.",
  },
  {
    name: "Edge",
    maker: "Edge",
    url: "https://edge.app",
    platforms: ["iOS", "Android"],
    shielded: "full",
    note: "Mainstream multi-asset wallet that defaults to shielded z-addresses, with private Maya swaps.",
  },
  {
    name: "Unstoppable Wallet",
    maker: "Horizontal Systems",
    url: "https://unstoppable.money/",
    platforms: ["iOS", "Android"],
    shielded: "full",
    note: "Non-custodial multi-coin wallet with full shielded ZEC and one-tap auto-shielding.",
  },
  {
    name: "Zipher",
    maker: "Atmosphere Labs",
    url: "https://zipher.to/",
    platforms: ["iOS", "Android", "Desktop", "Web"],
    shielded: "full",
    tag: "Beta",
    note: "Shielded-by-default Orchard wallet with a CLI for AI agents; open beta, not yet externally audited.",
  },
  {
    name: "zSTASH",
    maker: "Independent",
    url: "https://zstash.app/",
    platforms: ["Desktop"],
    shielded: "full",
    tag: "Coming soon",
    note: "Native Rust/Tauri desktop wallet with hardware support and DEX swaps; launching after a security audit.",
  },
];

const HARDWARE: Wallet[] = [
  {
    name: "Keystone",
    maker: "Keystone",
    url: "https://keyst.one",
    platforms: ["Hardware"],
    shielded: "full",
    note: "First hardware wallet with native shielded (Orchard) ZEC — send and receive shielded, fully air-gapped.",
  },
  {
    name: "Ledger",
    maker: "Ledger · Zondax",
    url: "https://www.ledger.com/coin/wallet/zcash",
    platforms: ["Hardware"],
    shielded: "partial",
    note: "Transparent by default; a separate Zondax app adds Sapling shielded on some models (not Orchard).",
  },
  {
    name: "Trezor",
    maker: "SatoshiLabs",
    url: "https://trezor.io/coins/wallet/zcash",
    platforms: ["Hardware"],
    shielded: "transparent",
    note: "Transparent (t-address) only — no shielded support, so it can't use Zcash's privacy features.",
  },
];

function ShieldedBadge({ level }: { level: Shielded }) {
  if (level === "full") return <Badge tone="emerald">Full shielded</Badge>;
  if (level === "partial") return <Badge tone="amber">Partial shielded</Badge>;
  return <Badge tone="zinc">Transparent only</Badge>;
}

function WalletCard({ w }: { w: Wallet }) {
  return (
    <a href={w.url} target="_blank" rel="noreferrer" className="block">
      <Card
        interactive
        className={
          w.flagship
            ? "h-full border-amber-500/30 bg-amber-500/[0.04]"
            : "h-full"
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-stone-900">
                {w.name}
              </span>
              {w.flagship ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25">
                  Flagship
                </span>
              ) : null}
              {w.tag ? (
                <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[10px] font-medium text-stone-600 ring-1 ring-inset ring-stone-300">
                  {w.tag}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-stone-500">{w.maker}</p>
          </div>
          <ShieldedBadge level={w.shielded} />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1">
          {w.platforms.map((p) => (
            <span
              key={p}
              className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 ring-1 ring-inset ring-stone-200"
            >
              {p}
            </span>
          ))}
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-stone-600">
          {w.note}
        </p>

        <p className="mt-3 text-xs font-medium text-amber-700">Visit ↗</p>
      </Card>
    </a>
  );
}

export default function WalletsPage() {
  return (
    <>
      <PageHeader
        title="Zcash Wallets"
        subtitle="Self-custody wallets for ZEC. Shielded (z-address) support is what makes Zcash private — prefer a 'Full shielded' wallet to send and receive privately."
      />

      <Card className="mb-8 flex items-start gap-3 border-emerald-500/20 bg-emerald-500/[0.05]">
        <IconShield className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700/70" />
        <p className="text-sm leading-relaxed text-emerald-900/80">
          <span className="font-medium text-emerald-900">
            Shielded = private.
          </span>{" "}
          Only shielded (Orchard/Sapling) transactions hide the amount, sender
          and receiver. Transparent (t-address) ZEC is public like Bitcoin. This
          list is informational — always download from the official site.
        </p>
      </Card>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Software wallets
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOFTWARE.map((w) => (
            <WalletCard key={w.name} w={w} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Hardware wallets
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HARDWARE.map((w) => (
            <WalletCard key={w.name} w={w} />
          ))}
        </div>
      </section>

      <p className="mt-6 text-xs text-stone-500">
        {SOFTWARE.length + HARDWARE.length} wallets · curated from official
        sources and the community wallet list, 2026 · shielded support verified
        per wallet. Deprecated (Nighthawk) and non-Zcash (Coinbase Wallet)
        options are intentionally omitted.
      </p>
    </>
  );
}
