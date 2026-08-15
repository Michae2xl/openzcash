/**
 * Curated mirror of the FPF "30-Day Review Period" announcement for the
 * Coinholder-Directed Retroactive Grants Program Q3 round (37 proposals),
 * posted by FPF on the community forum on Aug 14, 2026. The public ZCG
 * spreadsheet lags this post (16 of 37 rows, some stale amounts), so the
 * announcement is treated as the source of truth for the open round.
 *
 * Source: https://forum.zcashcommunity.com/t/30-day-review-period-coinholder-directed-retroactive-grants-program-q3/57056
 * Update or replace this file when the round closes or a new round opens.
 */

export type RoundBand = "under_25k" | "mid_25k_150k" | "over_150k";

export interface RoundProposal {
  rank: number;
  project: string;
  org: string;
  requestedUsdCents: number;
  summary: string;
  threadUrl: string;
  githubUrl: string;
  band: RoundBand;
}

export interface RoundBandSummary {
  key: RoundBand;
  label: string;
  count: number;
  totalUsdCents: number;
  sharePct: number;
}

export const COINHOLDER_ROUND = {
  label: "Q3 2026",
  announcedOn: "August 14, 2026",
  reviewCloses: "September 16, 2026 · 20:00 UTC",
  pollOpens: "September 17, 2026",
  proposalCount: 37,
  totalRequestedUsdCents: 901_357_320,
  sourceThreadUrl:
    "https://forum.zcashcommunity.com/t/30-day-review-period-coinholder-directed-retroactive-grants-program-q3/57056",
  githubRepoUrl:
    "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues",
  dataDocUrl:
    "https://docs.google.com/document/d/1FifVENG7ojNkbanheiDzbhBliBAqwV3aK8xWI6Q6_-A/edit",
  /** Ballot options as amended by FPF in the announcement thread (post #2). */
  ballotOptions: [
    "Accept",
    "Reject — Do Not Support the Proposed Project",
    "Reject — Would Reconsider in a Future Round at a Lower Amount",
    "Abstain",
  ],
} as const;

export const ROUND_BANDS: RoundBandSummary[] = [
  {
    key: "under_25k",
    label: "Under $25,000",
    count: 14,
    totalUsdCents: 15_574_120,
    sharePct: 1.7,
  },
  {
    key: "mid_25k_150k",
    label: "$25,000 – $150,000",
    count: 12,
    totalUsdCents: 82_165_000,
    sharePct: 9.1,
  },
  {
    key: "over_150k",
    label: "Over $150,000",
    count: 11,
    totalUsdCents: 803_618_200,
    sharePct: 89.2,
  },
];

export const ROUND_BAND_LABEL: Record<RoundBand, string> = {
  under_25k: "Under $25k",
  mid_25k_150k: "$25k – $150k",
  over_150k: "Over $150k",
};

/** All 37 proposals of the Q3 round, in the announcement's order. */
export const ROUND_PROPOSALS: RoundProposal[] = [
  {
    rank: 1,
    project: "Zcash Grants Hub",
    org: "Daniel Goh",
    requestedUsdCents: 305000,
    summary:
      "Unified platform aggregating ZCG, Coinholder, and ZecHub DAO proposals into one interface",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zcash-grants-hub-coinholder-program/55372",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/24",
    band: "under_25k",
  },
  {
    rank: 2,
    project: "ShieldedScan",
    org: "ShieldedScan",
    requestedUsdCents: 406000,
    summary:
      "Free, no-tracker Zcash block explorer with shielded-pool analytics and a keyless API",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-shieldedscan/57051",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/62",
    band: "under_25k",
  },
  {
    rank: 3,
    project: "ZecKit Post-M3 Stabilization and Developer Adoption",
    org: "Dapps over Apps",
    requestedUsdCents: 500000,
    summary:
      "Developer toolkit for local Zebra regtest environments and reusable CI workflows",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zeckit-post-m3-stabilization-and-developer-adoption-work/56992",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/44",
    band: "under_25k",
  },
  {
    rank: 4,
    project: "zcashtocash via ZcashLabs",
    org: "ZcashLabs",
    requestedUsdCents: 600000,
    summary:
      "Non-custodial ZEC-to-fiat service across 100+ geographies and six fiat apps",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zcash-labs-for-zcashto-cash/57047",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/60",
    band: "under_25k",
  },
  {
    rank: 5,
    project: "zec-ironwood-reconcile",
    org: "Steven Hert",
    requestedUsdCents: 825000,
    summary:
      "Rust CLI reconciling Orchard and Ironwood value-pool changes against Zebra’s balances",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zec-ironwood-reconcile-reproducible-orchard-ironwood-value-pool-reconciliation/56998",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/46",
    band: "under_25k",
  },
  {
    rank: 6,
    project: "Gleyo",
    org: "Gleyo",
    requestedUsdCents: 908120,
    summary:
      "Quest platform paying shielded ZEC rewards without upfront wallet setup",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-gleyo/56977",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/43",
    band: "under_25k",
  },
  {
    rank: 7,
    project: "Self-Sovereign Zcash Testnet Faucet",
    org: "Jino Labs",
    requestedUsdCents: 928000,
    summary:
      "Self-hosted testnet faucet running its own node, wallet, indexer, and miner",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-self-sovereign-zcash-testnet-faucet/57002",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/49",
    band: "under_25k",
  },
  {
    rank: 8,
    project: "CyphZec.com",
    org: "Thomas Zarebczan",
    requestedUsdCents: 1000000,
    summary:
      "Free dashboard for ZEC and CYPH prices, shielding, treasury, and network stats",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-cyphzec-com/57035",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/59",
    band: "under_25k",
  },
  {
    rank: 9,
    project: "ZecLedger",
    org: "ZecLedger",
    requestedUsdCents: 1000000,
    summary:
      "Read-only viewing-key accounting CLI producing cost-basis and gain-loss reports",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-zecledger/56969",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/42",
    band: "under_25k",
  },
  {
    rank: 10,
    project: "lightwalletd-rs",
    org: "jpgonzalezra",
    requestedUsdCents: 1072000,
    summary: "Independent Rust implementation of the Zcash light-client server",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-lightwalletd-rs/56955",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/41",
    band: "under_25k",
  },
  {
    rank: 11,
    project: "Blindvault",
    org: "TIDJANI Walid",
    requestedUsdCents: 1700000,
    summary:
      "Anonymous credential issuance middleware using BLS12-381 blind signatures",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-blindvault/56932",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/39",
    band: "under_25k",
  },
  {
    rank: 12,
    project: "Zallet RPC Parity Harness",
    org: "Creativesonchain",
    requestedUsdCents: 2000000,
    summary: "CLI comparing zcashd and Zallet JSON-RPC responses for parity",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zallet-rpc-parity-harness/56993",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/45",
    band: "under_25k",
  },
  {
    rank: 13,
    project: "Zecmap",
    org: "Batuhan",
    requestedUsdCents: 2130000,
    summary:
      "Interactive map of Zcash-accepting businesses, on web, Android, and iOS",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zecmap/56999",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/48",
    band: "under_25k",
  },
  {
    rank: 14,
    project: "Connaugh Zcash Videos",
    org: "Connaugh",
    requestedUsdCents: 2200000,
    summary:
      "Five short-form films cut from existing Zcash footage, published July–August 2026",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zkmarketer-videos/57031",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/55",
    band: "under_25k",
  },
  {
    rank: 15,
    project: "ZAP1 Attestation Protocol and Verification Tooling",
    org: "Frontier Compute",
    requestedUsdCents: 2800000,
    summary:
      "Attestation protocol anchoring Merkle commitments to mainnet via Orchard memos",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zap1-attestation-protocol-and-verification-tooling/55664",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/31",
    band: "mid_25k_150k",
  },
  {
    rank: 16,
    project: "ZecBooks",
    org: "SaneApps",
    requestedUsdCents: 3200000,
    summary:
      "Mac-native, local-first bookkeeping for shielded Zcash via viewing key",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zecbooks/56914",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/38",
    band: "mid_25k_150k",
  },
  {
    rank: 17,
    project: "CipherPay",
    org: "Atmosphere Labs (Kenbak)",
    requestedUsdCents: 3500000,
    summary:
      "Non-custodial commerce platform: payments, subscriptions, plugins, ticketing, POS",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-cipherpay/55612",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/30",
    band: "mid_25k_150k",
  },
  {
    rank: 18,
    project: "Zafu Browser Extension",
    org: "Rotko Networks OU",
    requestedUsdCents: 3800000,
    summary:
      "Chrome MV3 wallet with client-side Halo2 proving and FROST multisig",
    threadUrl:
      "https://forum.zcashcommunity.com/t/zafu-wallet-retroactive-grant-application/55551",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/29",
    band: "mid_25k_150k",
  },
  {
    rank: 19,
    project: "Zapp",
    org: "Renee Chiu",
    requestedUsdCents: 4000000,
    summary:
      "Encrypted P2P messenger with in-thread shielded payments and fiat offramps",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zapp/56937",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/40",
    band: "mid_25k_150k",
  },
  {
    rank: 20,
    project: "Open-Source Zcash Hardware-Wallet SDK",
    org: "wh00hw",
    requestedUsdCents: 4000000,
    summary:
      "Vendor-neutral plain-C Orchard hardware wallet stack across four repositories",
    threadUrl:
      "https://forum.zcashcommunity.com/t/application-for-coinholder-directed-retroactive-grants-program-q2-2026-open-source-zcash-hardware-wallet-sdk/55550",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/28",
    band: "mid_25k_150k",
  },
  {
    rank: 21,
    project: "Nozy Wallet",
    org: "Leonine DAO",
    requestedUsdCents: 6000000,
    summary:
      "Self-hosted shielded-first wallet: CLI, desktop, and companion API",
    threadUrl:
      "https://forum.zcashcommunity.com/t/nozy-wallet-retroactive-grant/52417/26",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/37",
    band: "mid_25k_150k",
  },
  {
    rank: 22,
    project: "THORSwap / Metro",
    org: "THORSwap Labs",
    requestedUsdCents: 6000000,
    summary: "Native ZEC cross-chain swaps across THORSwap and Metro wallet",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-thorswap-metro/55675",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/32",
    band: "mid_25k_150k",
  },
  {
    rank: 23,
    project: "Expanding Zcash In Unstoppable Wallet",
    org: "Horizontal Systems",
    requestedUsdCents: 8000000,
    summary:
      "Swap aggregation, wallet reliability, and full Ironwood migration support",
    threadUrl:
      "https://forum.zcashcommunity.com/t/expanding-zcash-in-unstoppable-wallet-liquidity-swaps-distribution-retroactive-grant/55529/3",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/25",
    band: "mid_25k_150k",
  },
  {
    rank: 24,
    project: "ZcashNames",
    org: "ZcashMe, Inc.",
    requestedUsdCents: 12240000,
    summary:
      "On-chain naming system mapping readable names to shielded addresses",
    threadUrl:
      "https://forum.zcashcommunity.com/t/coinholder-directed-retroactive-grants-program-q2-2026-now-accepting-proposals/55328/9",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/34",
    band: "mid_25k_150k",
  },
  {
    rank: 25,
    project: "Frontier Compute Zcash Security Research and Remediation Pack",
    org: "Frontier Compute LLC",
    requestedUsdCents: 13625000,
    summary:
      "Disclosed infrastructure and wallet vulnerabilities, then verified the shipped remediations",
    threadUrl:
      "https://forum.zcashcommunity.com/t/call-for-proposals-coinholder-directed-retroactive-grants-program-q3/56885/29",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/63",
    band: "mid_25k_150k",
  },
  {
    rank: 26,
    project: "Zebra Critical Vulnerability Bug Bounty (CVE-2026-34202)",
    org: "robustfengbin",
    requestedUsdCents: 15000000,
    summary:
      "Bounty for disclosure of a critical Zebra remote denial-of-service vulnerability",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-cve-2026-34202-zebra-remote-denial-of-service-critical/57024",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/54",
    band: "mid_25k_150k",
  },
  {
    rank: 27,
    project: "Bonus Grant — Ironwood zk-SNARK Formal Verification",
    org: "Jason McGee",
    requestedUsdCents: 26105800,
    summary: "Nomination topping up application #50 to a $1,000,000 total",
    threadUrl:
      "https://forum.zcashcommunity.com/t/project-tachyon-bonus-grant-for-ironwood-zk-snark-formal-verification/57021",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/52",
    band: "over_150k",
  },
  {
    rank: 28,
    project: "CipherScan",
    org: "Kenbak",
    requestedUsdCents: 37500000,
    summary:
      "Block explorer and privacy-intelligence platform with a custom Rust indexer",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-cipherscan/56997",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/47",
    band: "over_150k",
  },
  {
    rank: 29,
    project: "Temporary Detectable Unlimited Mint and Sell Exploit",
    org: "Alex Sol",
    requestedUsdCents: 40000000,
    summary:
      "Bounty for chained zcashd and Zebra vulnerabilities enabling temporary counterfeiting",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-temporary-detectable-unlimited-mint-and-sell-bug-bount/57033",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/57",
    band: "over_150k",
  },
  {
    rank: 30,
    project: "Five Critical Zebra Consensus Divergence Vulnerabilities",
    org: "sangsoo-osec",
    requestedUsdCents: 42500000,
    summary:
      "Net award for five critical Zebra consensus-divergence disclosures, less $100,000 already paid",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-five-critical-zebra-consensus-divergence-vulnerabilities/57034",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/58",
    band: "over_150k",
  },
  {
    rank: 31,
    project: "Zec.rocks (16 months of uptime)",
    org: "Zec.rocks",
    requestedUsdCents: 58499200,
    summary:
      "Infrastructure powering 16 months of uptime for every major Zcash wallet",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-16-months-of-uptime-for-zcash-wallets-zec-rocks/57048",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/61",
    band: "over_150k",
  },
  {
    rank: 32,
    project: "Ironwood external audit reimbursement",
    org: "ValarGroup",
    requestedUsdCents: 59900000,
    summary:
      "Reimbursement for external cryptography audits during the Ironwood incident response",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-ironwood-external-audits/57032",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/56",
    band: "over_150k",
  },
  {
    rank: 33,
    project: "Ironwood zk-SNARK Formal Verification (Project Tachyon)",
    org: "Tachyon Foundation",
    requestedUsdCents: 73813200,
    summary:
      "Formal verification of the Ironwood zk-SNARK circuit, machine-checked in Lean",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-ironwood-zk-snark-formal-verification-project-tachyon/57007",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/50",
    band: "over_150k",
  },
  {
    rank: 34,
    project: "Orchard Counterfeiting Vulnerability Bug Bounty",
    org: "Taylor Hornby",
    requestedUsdCents: 75000000,
    summary:
      "Bounty for disclosure of the Orchard counterfeiting vulnerability",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-orchard-counterfeiting-vulnerability-bug-bounty/57008",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/51",
    band: "over_150k",
  },
  {
    rank: 35,
    project: "Bonus Grant — Orchard Counterfeiting Bug Bounty",
    org: "Jason McGee",
    requestedUsdCents: 75000000,
    summary: "Nomination topping up application #51 to a $1,500,000 total",
    threadUrl:
      "https://forum.zcashcommunity.com/t/taylor-hornby-bonus-grant-for-orchard-counterfeiting-vulnerability-bug-bounty/57025",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/53",
    band: "over_150k",
  },
  {
    rank: 36,
    project: "ValarGroup Ironwood Work",
    org: "ValarGroup",
    requestedUsdCents: 120300000,
    summary:
      "Emergency development, integration, testing, and activation work for Ironwood (NU6.3)",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-valargroup-ironwood-work/57053",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/64",
    band: "over_150k",
  },
  {
    rank: 37,
    project: "ZODL Q1 2026 Core Protocol Development",
    org: "ZODL",
    requestedUsdCents: 195000000,
    summary:
      "Amended: vulnerability remediation, Zallet alpha.4, and ZIP 2005/256 progress",
    threadUrl:
      "https://forum.zcashcommunity.com/t/retroactive-grant-application-zodl-q1-q2-2026-core-protocol-development/57027",
    githubUrl:
      "https://github.com/Financial-Privacy-Foundation/ZcashCoinholderGrantsProgram/issues/33",
    band: "over_150k",
  },
];
