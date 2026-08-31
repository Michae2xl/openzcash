import { ZCG_GIDS, ZCG_SHEET_ID } from "../../lib/zcg/sheets";

export type FactTone = "current" | "past" | "identity";

export interface PublicFact {
  label: string;
  source: string;
  sourceLabel: string;
  tone: FactTone;
}

export interface LedgerFact {
  label: string;
  source: string;
  sourceLabel: string;
  tone: "open" | "history";
}

export interface Member {
  name: string;
  img: string;
  url: string;
  cohort: "june-2026" | "dec-2025";
  term: string;
  facts: PublicFact[];
  ledger?: {
    recipient: string;
    relation: "direct" | "organization";
    relationLabel?: string;
  };
  ledgerFacts?: LedgerFact[];
}

export const OFFICIAL_LEDGER_URL = `https://docs.google.com/spreadsheets/d/${ZCG_SHEET_ID}/edit`;
const ledgerRangeUrl = (gid: string, range: string) =>
  `${OFFICIAL_LEDGER_URL}#gid=${gid}&range=${range}`;

export const MEMBERS: Member[] = [
  {
    name: "GGuy",
    img: "/committee/gguy.png",
    url: "https://forum.zcashcommunity.com/u/gguy",
    cohort: "june-2026",
    term: "to Jun 2027",
    facts: [
      {
        label: "ZCG · fourth term",
        source:
          "https://forum.zcashcommunity.com/t/gguy-for-zcg-june-2026/56086",
        sourceLabel: "June 2026 nomination",
        tone: "current",
      },
    ],
  },
  {
    name: "Paul Brigner",
    img: "/committee/paulbrigner.png",
    url: "https://forum.zcashcommunity.com/u/paulbrigner",
    cohort: "june-2026",
    term: "to Jun 2027",
    facts: [
      {
        label: "ZODL · policy officer",
        source:
          "https://forum.zcashcommunity.com/t/paul-brigner-for-zcg-june-2026/55738",
        sourceLabel: "June 2026 nomination",
        tone: "current",
      },
      {
        label: "PGP · founder",
        source:
          "https://forum.zcashcommunity.com/t/paul-brigner-for-zcg-june-2026/55738",
        sourceLabel: "June 2026 nomination",
        tone: "current",
      },
    ],
    ledger: {
      recipient: "PGP for Crypto, LLC",
      relation: "organization",
      relationLabel: "PGP for Crypto",
    },
  },
  {
    name: "hanh",
    img: "/committee/hanh.png",
    url: "https://forum.zcashcommunity.com/u/hanh",
    cohort: "dec-2025",
    term: "to Dec 2026",
    facts: [
      {
        label: "YWallet · creator (legacy)",
        source: "https://github.com/hhanh00/zwallet",
        sourceLabel: "YWallet repository and deprecation notice",
        tone: "past",
      },
      {
        label: "Zkool · creator (current)",
        source: "https://github.com/hhanh00/zkool2",
        sourceLabel: "Zkool repository",
        tone: "current",
      },
      {
        label: "Coin Voting · builder",
        source:
          "https://forum.zcashcommunity.com/t/hanh-for-zcg-december-2025/53373",
        sourceLabel: "December 2025 nomination",
        tone: "identity",
      },
    ],
    ledger: { recipient: "Hanh", relation: "direct" },
    ledgerFacts: [
      {
        label: "zaino · completed Aug 2026",
        source: ledgerRangeUrl(ZCG_GIDS.grantsDisbursed, "A817:L817"),
        sourceLabel: "Official ZCG grants ledger",
        tone: "history",
      },
      {
        label: "Coin Voting · open grant",
        source: ledgerRangeUrl(ZCG_GIDS.grantsDisbursed, "A587:L599"),
        sourceLabel: "Official ZCG grants ledger",
        tone: "open",
      },
    ],
  },
  {
    name: "Zerodartz",
    img: "/committee/zerodartz.png",
    url: "https://forum.zcashcommunity.com/u/zerodartz",
    cohort: "dec-2025",
    term: "to Dec 2026",
    facts: [
      {
        label: "ZCG · re-elected Dec 2025",
        source:
          "https://forum.zcashcommunity.com/t/zcap-siv-poll-zcg-elections-open-now/53685/20",
        sourceLabel: "December 2025 election result",
        tone: "current",
      },
    ],
    ledger: { recipient: "Zerodartz", relation: "direct" },
    ledgerFacts: [
      {
        label: "2 travel entries · 2026",
        source: ledgerRangeUrl(ZCG_GIDS.discretionary, "A33:G35"),
        sourceLabel: "Official ZCG discretionary ledger",
        tone: "history",
      },
    ],
  },
  {
    name: "Artkor",
    img: "/committee/artkor.png",
    url: "https://forum.zcashcommunity.com/u/artkor",
    cohort: "dec-2025",
    term: "to Dec 2026",
    facts: [
      {
        label: "RUZcash · public alias",
        source:
          "https://forum.zcashcommunity.com/t/artkor-aka-ruzcash-for-zcg-december-2025/53449",
        sourceLabel: "December 2025 nomination",
        tone: "identity",
      },
    ],
  },
];
