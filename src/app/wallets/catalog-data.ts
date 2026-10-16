import { WALLET_EVIDENCE } from "@/lib/wallet-finder/evidence";
import { DEFAULT_REQUIREMENTS, matchWallets } from "@/lib/wallet-finder/matching";
import type { WalletPlatform } from "@/lib/wallet-finder/types";
import { darkWalletLogo } from "@/lib/wallet-logos";

/** Shared catalog and evidence-derived privacy labels for /wallets/find and Zarvis. */
/** Date of the last edit to the entries below (maintainer-set, not a review pass): update it in the same commit that adds, removes or corrects a wallet. */
export const WALLET_CATALOG_REVISED_ON = "2026-10-15";

// Editorial selection for discovery, kept separate from audit evidence.
export const EDITORIAL_HIGHLIGHTS = new Set(["Zodl", "Zingo!", "Vizor"]);

export type Shielded = "full" | "partial" | "transparent" | "unknown" | "unavailable";

export interface Wallet {
  name: string;
  maker: string;
  url: string;
  platforms: string[];
  shielded: Shielded;
  note: string;
  /** Short discovery copy; full platform and release limits stay in note/evidence. */
  summary: string;
  logo?: string;
  /** Light rendition for the dark theme, where the logo tile has no white fill; derived from the shared map for marks drawn in ink. */
  logoDark?: string;
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

// Descriptive catalog entries. Privacy labels are derived from reviewed evidence below.
const SOFTWARE_ENTRIES: Omit<Wallet, "shielded">[] = [
  {
    name: "Zodl",
    summary: "Shielded by default, from the team behind Zashi.",
    maker: "Zcash Open Development Lab",
    url: "https://zodl.com",
    // Official iOS AppIcon (zodl-inc/zodl-ios); content version refreshes cached artwork.
    logo: "/wallet-logos/zodl.png?v=ff209828",
    platforms: ["iOS", "Android"],
    flagship: true,
    note: "Formerly Zashi. Shielded by default, from the original core team.",
    source: "https://github.com/zodl-inc",
  },
  {
    name: "Zingo!",
    summary: "Shielded ZEC on iOS and Android, from Zingo Labs.",
    maker: "Zingo Labs",
    url: "https://zingolabs.org/zingo/",
    logo: "/wallet-logos/zingo.png?v=e269f01b",
    platforms: ["iOS", "Android"],
    note: "Shielded sending and receiving on iOS and Android. Desktop availability is not verified.",
    source: "https://github.com/zingolabs",
  },
  {
    name: "Ywallet",
    summary: "Shielded Zcash and Ycash on mobile and desktop.",
    maker: "hanh",
    url: "https://ywallet.app",
    logo: "/wallet-logos/ywallet.png",
    platforms: ["iOS", "Android", "Desktop"],
    note: "Zcash and Ycash wallet with shielded sending and receiving. Check the evidence for supported desktop systems.",
    source: "https://github.com/hhanh00/zwallet",
    audit: "https://defuse.ca/zecsec/audits/YWalletAuditReport-FINALv3.pdf",
  },
  {
    name: "zkool",
    summary: "Shielded Zcash on mobile and desktop, by hanh.",
    maker: "hanh",
    url: "https://github.com/hhanh00/zkool2",
    logo: "/wallet-logos/zkool.png",
    platforms: ["iOS", "Android", "Desktop"],
    note: "Shielded software wallet on mobile and desktop. Current Ledger shielded signing is not verified.",
    source: "https://github.com/hhanh00/zkool2",
  },
  {
    name: "Brave Wallet",
    summary: "Shielded ZEC inside the Brave desktop browser.",
    maker: "Brave Software",
    url: "https://brave.com/wallet/",
    logo: "/wallet-logos/brave.png",
    platforms: ["Desktop"],
    note: "Shielded ZEC in the desktop Brave browser. Reviewed support documentation excludes mobile Zcash.",
    source: "https://github.com/brave/brave-core",
  },
  {
    name: "Noir Wallet",
    summary: "Shielded ZEC in a Chrome extension by RHEA Finance.",
    maker: "RHEA Finance",
    url: "https://www.zknoir.com/",
    logo: "/wallet-logos/noir.png",
    platforms: ["Browser extension"],
    note: "Chrome extension with shielded ZEC and documented hardware flows. Integration limits apply.",
  },
  {
    name: "Zucchini Wallet",
    summary: "Shielded ZEC in Chrome; swaps may use transparent addresses.",
    maker: "Zucchini",
    url: "https://zucchinifi.xyz/",
    logo: "/wallet-logos/zucchini.png",
    platforms: ["Browser extension"],
    note: "Chrome extension with shielded ZEC sending and receiving. Some swap routes use transparent addresses before shielding.",
    // The current extension's linked source is unavailable; no verified license or audit badge.
  },
  {
    name: "MetaMask Snap",
    summary: "Zcash for MetaMask; current usability is unverified.",
    maker: "ChainSafe",
    url: "https://snaps.metamask.io/snap/npm/chainsafe/webzjs-zcash-snap/",
    logo: "/wallet-logos/metamask.png",
    platforms: ["Browser extension"],
    note: "Published Zcash Snap for MetaMask. Current usability is unverified after unresolved network-upgrade reports.",
    source: "https://github.com/ChainSafe/WebZjs",
    audit: "https://hacken.io/audits/zcash/dapp-zcash-snap-may2025/",
  },
  {
    name: "Vizor",
    summary: "Shielded by default with Keystone support, from the Keplr team.",
    maker: "Chainapsis (Keplr)",
    url: "https://vizor.cash/",
    logo: "/wallet-logos/vizor.png",
    platforms: ["iOS", "Android", "Desktop"],
    note: "Shielded by default with Keystone support, from the Keplr team.",
    source: "https://github.com/chainapsis/vizor-wallet",
  },
  {
    name: "Cake Wallet",
    summary: "Shielded Zcash and other coins on iOS and Android.",
    maker: "Cake Labs",
    url: "https://cakewallet.com",
    logo: "/wallet-logos/cake.png",
    platforms: ["iOS", "Android", "Desktop"],
    note: "Multi-coin wallet with documented shielded mobile transfers. Linux shielded parity is not verified.",
    source: "https://github.com/cake-tech/cake_wallet",
  },
  {
    name: "Edge",
    summary: "Multi-asset mobile wallet with shielded Zcash.",
    maker: "Edge",
    url: "https://edge.app",
    logo: "/wallet-logos/edge.png",
    platforms: ["iOS", "Android"],
    note: "Mainstream multi-asset wallet defaulting to shielded z-addresses.",
    source: "https://github.com/EdgeApp/edge-react-gui",
  },
  {
    name: "Unstoppable Wallet",
    summary: "Multi-coin mobile wallet with shielded ZEC.",
    maker: "Horizontal Systems",
    url: "https://unstoppable.money/",
    logo: "/wallet-logos/unstoppable.png",
    platforms: ["iOS", "Android"],
    note: "Multi-coin mobile wallet with documented shielded Zcash sending and receiving.",
    source: "https://github.com/horizontalsystems/unstoppable-wallet-android",
  },
  {
    name: "Zipher",
    summary: "Mobile beta: private sending; receiving unverified.",
    maker: "Atmosphere Labs",
    url: "https://zipher.to/",
    logo: "/wallet-logos/zipher.png",
    platforms: ["iOS", "Android"],
    tag: "Beta",
    note: "Mobile beta with shielded sending; receiving remains unverified. A separate CLI is in alpha.",
    source: "https://github.com/atmospherelabs-dev/zipher-app",
  },
  {
    name: "zSTASH",
    summary: "Desktop wallet announced; no usable public release.",
    maker: "Independent",
    url: "https://zstash.app/",
    logo: "/wallet-logos/zstash.png?v=f9e1a9e1",
    platforms: ["Desktop"],
    tag: "Coming soon",
    note: "Announced desktop wallet. No public usable release or planned capabilities are confirmed.",
  },
  {
    name: "Zapp",
    summary: "Shielded ZEC on Android and iOS TestFlight.",
    maker: "JustZappIt",
    url: "https://www.justzappit.xyz/",
    logo: "/wallet-logos/zappit.png",
    platforms: ["Android", "iOS"],
    note: "Shielded Zcash mobile wallet. Android public app and iOS public TestFlight beta.",
  },
  {
    name: "Gem Wallet",
    summary: "Multi-chain wallet with transparent ZEC only.",
    maker: "Gem Wallet",
    url: "https://gemwallet.com",
    logo: "/wallet-logos/gem.png",
    platforms: ["iOS", "Android"],
    // Verified in the source: Zcash lives in the gem_bitcoin UTXO crate, only
    // t1/t3 address scripts are parsed, and the v5 sighash passes EMPTY
    // sapling/orchard digests — transparent send and receive, no shielded.
    note: "Multi-chain self-custodial wallet; transparent (t-address) ZEC only.",
    source: "https://github.com/gemwalletcom/wallet",
    audit:
      "https://static.gemwallet.com/audits/Gem-Wallet-CertiK-Security-Audit-April-2026.pdf",
  },
];

const HARDWARE_ENTRIES: Omit<Wallet, "shielded">[] = [
  {
    name: "Keystone",
    summary: "Keystone 3 Pro: shielded ZEC with compatible firmware and wallet.",
    maker: "Keystone",
    url: "https://keyst.one",
    logo: "/wallet-logos/keystone.png",
    platforms: ["Hardware"],
    note: "Keystone 3 Pro with Cypherpunk firmware and a compatible Zodl or Vizor companion supports shielded ZEC.",
    source: "https://github.com/KeystoneHQ/keystone3-firmware",
    audit:
      "https://blog.keyst.one/deep-dive-into-next-gen-hardware-wallet-crashing-keystone3-pro-audit-2729bc551d7b",
  },
  {
    name: "Ledger",
    summary: "Shielded ZEC with Ledger Wallet Desktop and a compatible device.",
    maker: "Ledger",
    url: "https://www.ledger.com/coin/wallet/zcash",
    logo: "/wallet-logos/ledger.png",
    platforms: ["Hardware"],
    note: "Shielded send and receive in Ironwood via Ledger Wallet Desktop 4.21+ and the Ledger Zcash (ZEC) app 3.9.4+, with current Ledger OS. Excludes original Nano S and mobile. Legacy Zondax accounts use a separate app.",
    audit: "https://defuse.ca/zecsec/audits/zcash-ledger-audit-report-v2.pdf",
  },
  {
    name: "Trezor",
    summary: "Hardware storage for transparent ZEC; no shielded support.",
    maker: "SatoshiLabs",
    url: "https://trezor.io/coins/wallet/zcash",
    logo: "/wallet-logos/trezor.png?v=675e01fc",
    platforms: ["Hardware"],
    note: "Transparent (t-address) only; no shielded support.",
    source: "https://github.com/trezor/trezor-firmware",
  },
];

const PLATFORM_KEYS: Record<string, WalletPlatform> = {
  iOS: "ios", Android: "android", Desktop: "desktop",
  "Browser extension": "browser", Web: "web", Hardware: "hardware",
};
const PLATFORM_NAMES = Object.fromEntries(Object.entries(PLATFORM_KEYS).map(([label, key]) => [key, label]));

/** The badge means a scoped public report exists; it is never a safety rating. */
export function walletPublicAudit(walletName: string, selectedPlatform = "") {
  const profile = WALLET_EVIDENCE.find((item) => item.walletName === walletName);
  if (!profile) return null;
  const platform = PLATFORM_KEYS[selectedPlatform];
  const entries = Object.entries(profile.platforms).filter(([key]) => !platform || key === platform);
  for (const [, facts] of entries) {
    const record = facts?.securityAudit;
    if (record?.status === "supported" && record.checkedAt && record.scope.trim() && record.sources.length) {
      return { source: record.sources[0], scope: record.scope, checkedAt: record.checkedAt };
    }
  }
  return null;
}

/** A label is valid only when availability and both directions are documented on the same platform. */
export function walletPrivacy(walletName: string, selectedPlatform = ""): {
  level: Shielded; platforms: string[]; availability: "match" | "unknown" | "excluded";
} {
  const profile = WALLET_EVIDENCE.find((item) => item.walletName === walletName);
  if (!profile) return { level: "unknown", platforms: [], availability: "unknown" };
  const requirements = { ...DEFAULT_REQUIREMENTS, platform: PLATFORM_KEYS[selectedPlatform] ?? "any" } as const;
  const available = matchWallets([profile], requirements)[0];
  const both = matchWallets([profile], { ...requirements, shielded: "both" })[0];
  const result = { platforms: both.platforms.map((key) => PLATFORM_NAMES[key]), availability: available.status };
  if (both.status === "match") return { ...result, level: "full" };
  if (available.status === "excluded") return { ...result, level: "unavailable" };
  if (available.status === "unknown" || both.status === "unknown") return { ...result, level: "unknown" };
  // Only explicit, sourced rejection of both directions establishes transparent-only support.
  const candidates = available.platforms.map((key) => profile.platforms[key]!);
  const documentedNo = (fact: typeof profile.availability) => fact.status === "unsupported" && fact.sources.length > 0 && !!fact.checkedAt && !!fact.scope.trim();
  if (candidates.length && candidates.every((facts) => documentedNo(facts.shieldedSend) && documentedNo(facts.shieldedReceive))) {
    return { ...result, level: "transparent" };
  }
  const directionConfirmed = ["send", "receive"].some((shielded) => matchWallets([profile], { ...requirements, shielded: shielded as "send" | "receive" })[0].status === "match");
  return { ...result, level: directionConfirmed ? "partial" : "unknown" };
}

function describeWallet(wallet: Omit<Wallet, "shielded">): Wallet {
  const logoDark = wallet.logo ? darkWalletLogo(wallet.logo) : undefined;
  return { ...wallet, ...(logoDark ? { logoDark } : {}), shielded: walletPrivacy(wallet.name).level };
}
export const SOFTWARE: Wallet[] = SOFTWARE_ENTRIES.map(describeWallet);
export const HARDWARE: Wallet[] = HARDWARE_ENTRIES.map(describeWallet);
