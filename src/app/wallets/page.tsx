/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { Card, PageHeader } from "@/components/ui";
import { IconShield } from "@/components/icons";
import { cn } from "@/lib/utils";

// A distinct "LED" glow colour per wallet — everyone gets one, nobody is
// singled out or promoted. Assigned by position so the grid never repeats.
const LED = [
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#6366f1",
  "#ec4899",
  "#84cc16",
  "#06b6d4",
  "#f97316",
  "#a855f7",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#d946ef",
];

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
  /** Public source repository — set ONLY when the wallet itself (app or
   * firmware) is fully open source, verified per repo + license. Absent for
   * closed/unpublished wallets and for Ledger (open app, proprietary OS). */
  source?: string;
  /** Public third-party security audit REPORT for this wallet (or, for
   * Ledger, its Zcash app) — set only with a verifiable report link. */
  audit?: string;
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
    note: "Formerly Zashi — shielded by default, by the original core team.",
    source: "https://github.com/zodl-inc",
  },
  {
    name: "Zingo!",
    maker: "Zingo Labs",
    url: "https://zingolabs.org/zingo/",
    logo: "/wallet-logos/zingo.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Open-source, shielded by default, with view-only UFVK import.",
    source: "https://github.com/zingolabs",
  },
  {
    name: "Ywallet",
    maker: "hanh",
    url: "https://ywallet.app",
    logo: "/wallet-logos/ywallet.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Fast shielded send/receive with an encrypted messenger.",
    source: "https://github.com/hhanh00/zwallet",
    audit: "https://defuse.ca/zecsec/audits/YWalletAuditReport-FINALv3.pdf",
  },
  {
    name: "zkool",
    maker: "hanh",
    url: "https://github.com/hhanh00/zkool2",
    logo: "/wallet-logos/zkool.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "hanh's successor to Ywallet — full shielded with UFVK import.",
    source: "https://github.com/hhanh00/zkool2",
  },
  {
    name: "Brave Wallet",
    maker: "Brave Software",
    url: "https://brave.com/wallet/",
    logo: "/wallet-logos/brave.png",
    platforms: ["Desktop", "iOS", "Android"],
    shielded: "full",
    note: "Shielded ZEC built into the Brave browser, via zk-proofs.",
    source: "https://github.com/brave/brave-core",
  },
  {
    name: "Noir Wallet",
    maker: "RHEA Finance",
    url: "https://www.zknoir.com/",
    logo: "/wallet-logos/noir.png",
    platforms: ["Browser extension"],
    shielded: "full",
    note: "First browser-extension wallet with shielded ZEC and DeFi.",
  },
  {
    name: "MetaMask Snap",
    maker: "ChainSafe",
    url: "https://snaps.metamask.io/snap/npm/chainsafe/webzjs-zcash-snap/",
    logo: "/wallet-logos/metamask.png",
    platforms: ["Browser extension"],
    shielded: "full",
    note: "Shielded ZEC inside MetaMask — ZCG-funded, Hacken-audited.",
    source: "https://github.com/ChainSafe/WebZjs",
    audit: "https://hacken.io/audits/zcash/dapp-zcash-snap-may2025/",
  },
  {
    name: "Vizor",
    maker: "Chainapsis (Keplr)",
    url: "https://vizor.cash/",
    logo: "/wallet-logos/vizor.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Shielded by default with Keystone support, from the Keplr team.",
    source: "https://github.com/chainapsis/vizor-wallet",
  },
  {
    name: "Cake Wallet",
    maker: "Cake Labs",
    url: "https://cakewallet.com",
    logo: "/wallet-logos/cake.png",
    platforms: ["iOS", "Android", "Desktop"],
    shielded: "full",
    note: "Multi-coin privacy wallet; auto-shields and always sends shielded.",
    source: "https://github.com/cake-tech/cake_wallet",
  },
  {
    name: "Edge",
    maker: "Edge",
    url: "https://edge.app",
    logo: "/wallet-logos/edge.png",
    platforms: ["iOS", "Android"],
    shielded: "full",
    note: "Mainstream multi-asset wallet defaulting to shielded z-addresses.",
    source: "https://github.com/EdgeApp/edge-react-gui",
  },
  {
    name: "Unstoppable Wallet",
    maker: "Horizontal Systems",
    url: "https://unstoppable.money/",
    logo: "/wallet-logos/unstoppable.png",
    platforms: ["iOS", "Android"],
    shielded: "full",
    note: "Multi-coin wallet with full shielded ZEC and auto-shielding.",
    source: "https://github.com/horizontalsystems/unstoppable-wallet-android",
  },
  {
    name: "Zipher",
    maker: "Atmosphere Labs",
    url: "https://zipher.to/",
    logo: "/wallet-logos/zipher.png",
    platforms: ["iOS", "Android", "Desktop", "Web"],
    shielded: "full",
    tag: "Beta",
    note: "Shielded-by-default Orchard wallet with a CLI for AI agents.",
    source: "https://github.com/atmospherelabs-dev/zipher-app",
  },
  {
    name: "zSTASH",
    maker: "Independent",
    url: "https://zstash.app/",
    logo: "/wallet-logos/zstash.png",
    platforms: ["Desktop"],
    shielded: "full",
    tag: "Coming soon",
    note: "Native Rust desktop wallet with hardware support and DEX swaps.",
  },
  {
    name: "Zapp",
    maker: "JustZappIt",
    url: "https://www.justzappit.xyz/",
    logo: "/wallet-logos/zappit.png",
    platforms: ["Android"],
    shielded: "full",
    tag: "Beta",
    note: "P2P messenger with a shielded Zodl-based wallet and PIX/UPI offramp.",
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
    note: "First hardware wallet with native shielded (Orchard) ZEC — air-gapped.",
    source: "https://github.com/KeystoneHQ/keystone3-firmware",
    audit:
      "https://blog.keyst.one/deep-dive-into-next-gen-hardware-wallet-crashing-keystone3-pro-audit-2729bc551d7b",
  },
  {
    name: "Ledger",
    maker: "Ledger · Zondax",
    url: "https://www.ledger.com/coin/wallet/zcash",
    logo: "/wallet-logos/ledger.png",
    platforms: ["Hardware"],
    shielded: "partial",
    note: "Transparent by default; a Zondax app adds Sapling on some models.",
    audit: "https://defuse.ca/zecsec/audits/zcash-ledger-audit-report-v2.pdf",
  },
  {
    name: "Trezor",
    maker: "SatoshiLabs",
    url: "https://trezor.io/coins/wallet/zcash",
    logo: "/wallet-logos/trezor.png",
    platforms: ["Hardware"],
    shielded: "transparent",
    note: "Transparent (t-address) only — no shielded support.",
    source: "https://github.com/trezor/trezor-firmware",
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
    ringColor: "ring-emerald-400/70",
    monoBg: "bg-emerald-50 text-emerald-700",
    label: "Full shielded",
    text: "text-emerald-700",
  },
  partial: {
    ringColor: "ring-amber-400/70",
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

function WalletCard({ w, led }: { w: Wallet; led: string }) {
  const s = SHIELDED[w.shielded];
  const star = w.flagship || STARRED.has(w.name);
  return (
    // Stretched-link pattern: the whole card links to the wallet site via an
    // absolutely-positioned overlay, so the source badge can be its own real
    // link (nested <a> is invalid HTML).
    <div
      style={{ "--led": led } as CSSProperties}
      className="group relative h-full"
    >
      <a
        href={w.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${w.name} website`}
        className="absolute inset-0 z-10 rounded-2xl"
      />
      <div className="flex h-full flex-col rounded-2xl bg-white p-4 shadow-[0_0_0_1px_var(--led),0_5px_18px_-9px_var(--led)] transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_0_1.5px_var(--led),0_12px_28px_-7px_var(--led)]">
        <div className="flex items-center gap-3">
          {w.logo ? (
            <img
              src={w.logo}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-inset ring-stone-200"
            />
          ) : (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-inset ring-stone-200",
                s.monoBg,
              )}
              aria-hidden="true"
            >
              {w.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold tracking-wide text-stone-900">
                {w.name.toUpperCase()}
              </span>
              {star ? (
                <span className="shrink-0 text-xs text-amber-500">★</span>
              ) : null}
              {w.tag ? (
                <span className="shrink-0 rounded-full bg-stone-200/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-stone-600">
                  {w.tag}
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs font-medium text-stone-500">
              {w.maker}
            </p>
          </div>
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-amber-600/70 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
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

        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-stone-600">
          {w.note}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-3.5">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            {w.platforms.map((p) => (
              <span
                key={p}
                className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600"
              >
                {p}
              </span>
            ))}
            {w.source ? (
              // relative + z-20 lifts this link above the stretched overlay.
              <a
                href={w.source}
                target="_blank"
                rel="noreferrer"
                title={`Fully open source — code at ${w.source.replace("https://", "")}`}
                className="relative z-20 rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-inset ring-sky-500/20 transition hover:bg-sky-500/20"
              >
                Open source
              </a>
            ) : null}
            {w.audit ? (
              <a
                href={w.audit}
                target="_blank"
                rel="noreferrer"
                title="Public third-party security audit — opens the report"
                className="relative z-20 rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-800 ring-1 ring-inset ring-violet-500/20 transition hover:bg-violet-500/20"
              >
                Audited
              </a>
            ) : null}
          </div>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-[11px] font-semibold",
              s.text,
            )}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {s.label}
          </span>
        </div>
      </div>
    </div>
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
        <p className="text-sm leading-relaxed text-emerald-900/85">
          <span className="font-semibold text-emerald-900">
            Shielded = private.
          </span>{" "}
          Only shielded (Orchard/Sapling) transactions hide the amount, sender
          and receiver. Transparent (t-address) ZEC is public like Bitcoin.
        </p>
      </Card>

      <section className="mb-8">
        <h2 className="mb-3.5 text-sm font-semibold text-stone-700">
          Software wallets
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {SOFTWARE.map((w, i) => (
            <WalletCard key={w.name} w={w} led={LED[i % LED.length]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3.5 text-sm font-semibold text-stone-700">
          Hardware wallets
        </h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {HARDWARE.map((w, i) => (
            <WalletCard
              key={w.name}
              w={w}
              led={LED[(SOFTWARE.length + i) % LED.length]}
            />
          ))}
        </div>
      </section>

      <p className="mt-7 text-xs text-stone-500">
        {SOFTWARE.length + HARDWARE.length} wallets · curated from official
        sources, 2026 · shielded support verified per wallet. The{" "}
        <span className="rounded-md bg-sky-500/10 px-1.5 py-px text-[10px] font-medium text-sky-800 ring-1 ring-inset ring-sky-500/20">
          Open source
        </span>{" "}
        badge links to the public repository and appears only when the wallet
        itself (app or firmware) is fully open source, verified per repo and
        license; Ledger is excluded because its device OS is proprietary even
        though its Zcash app is open. The{" "}
        <span className="rounded-md bg-violet-500/10 px-1.5 py-px text-[10px] font-medium text-violet-800 ring-1 ring-inset ring-violet-500/20">
          Audited
        </span>{" "}
        badge links to a public third-party security audit report of the wallet
        itself (for Ledger, of its Zcash app) — absence means no public report
        was found, not that the wallet is unsafe. Deprecated (Nighthawk) and
        non-Zcash (Coinbase Wallet) options are omitted.
      </p>
    </>
  );
}
