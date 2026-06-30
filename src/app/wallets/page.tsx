/* eslint-disable @next/next/no-img-element */
import { Card, PageHeader } from "@/components/ui";
import { IconShield } from "@/components/icons";
import { cn } from "@/lib/utils";

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
  logo?: string;
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
    logo: "/wallet-logos/zodl.png",
    platforms: ["iOS", "Android"],
    shielded: "full",
    flagship: true,
    note: "Formerly Zashi — shielded by default with auto-shielding, from the core team that kept building it after leaving ECC.",
  },
  {
    name: "Zingo!",
    maker: "Zingo Labs",
    url: "https://zingolabs.org/zingo/",
    logo: "/wallet-logos/zingo.png",
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
    name: "zkool",
    maker: "hanh",
    url: "https://github.com/hhanh00/zkool2",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "hanh's successor to Ywallet — full shielded send/receive (Orchard/Sapling) with watch-only UFVK import.",
  },
  {
    name: "Brave Wallet",
    maker: "Brave Software",
    url: "https://brave.com/wallet/",
    logo: "/wallet-logos/brave.png",
    platforms: ["Desktop", "iOS", "Android"],
    shielded: "full",
    note: "Built into the Brave browser; supports Transparent, Unified and Shielded ZEC accounts via zk-proofs.",
  },
  {
    name: "Noir Wallet",
    maker: "RHEA Finance",
    url: "https://www.zknoir.com/",
    logo: "/wallet-logos/noir.png",
    platforms: ["Browser extension"],
    shielded: "full",
    note: "First browser-extension wallet to bring shielded ZEC together with native DeFi.",
  },
  {
    name: "MetaMask Snap",
    maker: "ChainSafe",
    url: "https://snaps.metamask.io/snap/npm/chainsafe/webzjs-zcash-snap/",
    logo: "/wallet-logos/metamask.png",
    platforms: ["Browser extension"],
    shielded: "full",
    note: "Full shielded ZEC inside MetaMask — ChainSafe's WebZjs Snap, ZCG-funded and Hacken-audited.",
  },
  {
    name: "Vizor",
    maker: "Chainapsis (Keplr)",
    url: "https://vizor.cash/",
    logo: "/wallet-logos/vizor.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Open-source wallet, shielded by default, with Keystone hardware support — from the team behind Keplr.",
  },
  {
    name: "Cake Wallet",
    maker: "Cake Labs",
    url: "https://cakewallet.com",
    logo: "/wallet-logos/cake.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Multi-coin privacy wallet that auto-shields incoming funds and always sends from a shielded source.",
  },
  {
    name: "Edge",
    maker: "Edge",
    url: "https://edge.app",
    logo: "/wallet-logos/edge.png",
    platforms: ["iOS", "Android"],
    shielded: "full",
    note: "Mainstream multi-asset wallet that defaults to shielded z-addresses, with private Maya swaps.",
  },
  {
    name: "Unstoppable Wallet",
    maker: "Horizontal Systems",
    url: "https://unstoppable.money/",
    logo: "/wallet-logos/unstoppable.png",
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
    logo: "/wallet-logos/zstash.png",
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
    logo: "/wallet-logos/keystone.png",
    platforms: ["Hardware"],
    shielded: "full",
    note: "First hardware wallet with native shielded (Orchard) ZEC — send and receive shielded, fully air-gapped.",
  },
  {
    name: "Ledger",
    maker: "Ledger · Zondax",
    url: "https://www.ledger.com/coin/wallet/zcash",
    logo: "/wallet-logos/ledger.png",
    platforms: ["Hardware"],
    shielded: "partial",
    note: "Transparent by default; a separate Zondax app adds Sapling shielded on some models (not Orchard).",
  },
  {
    name: "Trezor",
    maker: "SatoshiLabs",
    url: "https://trezor.io/coins/wallet/zcash",
    logo: "/wallet-logos/trezor.png",
    platforms: ["Hardware"],
    shielded: "transparent",
    note: "Transparent (t-address) only — no shielded support, so it can't use Zcash's privacy features.",
  },
];

// Wallets the user asked to mark with a star (plus the flagship, which always has one).
const STARRED = new Set([
  "Zingo!",
  "zkool",
  "Vizor",
  "Edge",
  "Cake Wallet",
  "Noir Wallet",
  "Brave Wallet",
  "Unstoppable Wallet",
  "Keystone",
  "Ledger",
  "Trezor",
]);

const SHIELDED: Record<
  Shielded,
  { ringColor: string; monoBg: string; label: string; text: string }
> = {
  full: {
    ringColor: "ring-emerald-400/60",
    monoBg: "bg-emerald-50 text-emerald-700",
    label: "Full shielded",
    text: "text-emerald-700",
  },
  partial: {
    ringColor: "ring-amber-400/60",
    monoBg: "bg-amber-50 text-amber-700",
    label: "Partial",
    text: "text-amber-700",
  },
  transparent: {
    ringColor: "ring-stone-300",
    monoBg: "bg-stone-100 text-stone-500",
    label: "Transparent",
    text: "text-stone-500",
  },
};

function WalletCard({ w }: { w: Wallet }) {
  const s = SHIELDED[w.shielded];
  const star = w.flagship || STARRED.has(w.name);
  return (
    <a
      href={w.url}
      target="_blank"
      rel="noreferrer"
      className="group block h-full"
    >
      <div
        className={cn(
          "flex h-full flex-col rounded-xl border bg-white p-3 shadow-sm shadow-stone-200/50 transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:shadow-stone-300/50",
          w.flagship
            ? "border-amber-400/50 bg-gradient-to-br from-amber-50/60 to-white"
            : "border-stone-200/80 group-hover:border-stone-300",
        )}
      >
        <div className="flex items-center gap-2.5">
          {w.logo ? (
            <img
              src={w.logo}
              alt=""
              width={36}
              height={36}
              className={cn(
                "h-9 w-9 shrink-0 rounded-full bg-white object-contain p-1 ring-2 ring-inset",
                s.ringColor,
              )}
            />
          ) : (
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ring-2 ring-inset",
                s.ringColor,
                s.monoBg,
              )}
              aria-hidden="true"
            >
              {w.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[13px] font-semibold tracking-wide text-stone-900">
                {w.name.toUpperCase()}
              </span>
              {star ? (
                <span className="shrink-0 text-[11px] text-amber-500">★</span>
              ) : null}
              {w.tag ? (
                <span className="shrink-0 rounded-full bg-stone-200/70 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-stone-600">
                  {w.tag}
                </span>
              ) : null}
            </div>
            <p className="truncate text-[11px] text-stone-500">{w.maker}</p>
          </div>
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-amber-600/70 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
          >
            <path
              d="M3.5 8h8m0 0L8 4.5M11.5 8L8 11.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-stone-600">
          {w.note}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <div className="flex min-w-0 flex-wrap gap-1">
            {w.platforms.map((p) => (
              <span
                key={p}
                className="rounded bg-stone-100 px-1.5 py-px text-[9.5px] font-medium text-stone-500"
              >
                {p}
              </span>
            ))}
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 text-[10px] font-medium",
              s.text,
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {s.label}
          </span>
        </div>
      </div>
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

      <Card className="mb-7 flex items-start gap-3 border-emerald-500/20 bg-emerald-500/[0.05]">
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

      <section className="mb-7">
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Software wallets
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOFTWARE.map((w) => (
            <WalletCard key={w.name} w={w} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-stone-700">
          Hardware wallets
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
