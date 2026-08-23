/**
 * The curated dataset behind /communities: the global Zcash community groups,
 * their links, and their ZCG funding status.
 *
 * Curation rules (same discipline as the rest of the site):
 * - `zcg` numbers come from the audited ledger only (recipients/disbursements
 *   mirrors). A community with no ledger rows is `funded: false` — that
 *   absence is information, not an error.
 * - `forumTopics` are hand-picked forum topics (monthly reports, applications)
 *   whose live activity is fetched at request time; nothing here is scraped
 *   from X, which has no free API — X profiles are links only.
 * - Seeded from ZecHub's community-links page (the wiki's markdown source)
 *   plus the forum record, then verified per link.
 */

export type Region =
  "Latin America" | "Africa" | "Asia" | "Europe" | "Middle East" | "Global";

export interface CommunityLinks {
  x?: string;
  telegram?: string;
  discord?: string;
  youtube?: string;
  site?: string;
  /** Forum username of the lead / official account, without @. */
  forumUser?: string;
}

export interface CommunityZcg {
  /** True when the community has rows in the audited ZCG ledger. */
  funded: boolean;
  /** Exact recipient name in the ledger (differs from the public name). */
  recipient?: string;
  /** Budgeted USD total across its grants (ledger `usd`, NOT paid). */
  budgetedUsd?: number;
  /** Number of distinct grants in the ledger. */
  grants?: number;
  /** ISO date of the most recent paid disbursement. */
  lastPaid?: string;
  /** Funding nuance: other channels (ZecHub DAO, Global Ambassador), etc. */
  note?: string;
}

export interface CommunityTopic {
  /** Discourse topic id on forum.zcashcommunity.com. */
  id: number;
  title: string;
  kind: "report" | "application" | "announcement" | "thread";
}

export interface Community {
  /** Stable slug (also the React key). */
  id: string;
  name: string;
  country: string;
  /** Emoji flag (or 🌐 for non-geographic groups). */
  flag: string;
  region: Region;
  language: string;
  links: CommunityLinks;
  zcg: CommunityZcg;
  /** Forum topics tracked for the live activity timeline. */
  forumTopics: CommunityTopic[];
  /** One-line description of who they are / what they do. */
  about: string;
}

export const COMMUNITIES: Community[] = [
  {
    id: "zechub",
    name: "ZecHub",
    country: "Global",
    flag: "🌐",
    region: "Global",
    language: "English",
    links: {"x": "https://x.com/zechub", "discord": "https://discord.gg/zcash", "site": "https://zechub.wiki", "forumUser": "squirrel"},
    zcg: {"funded": true, "recipient": "ZecHub", "budgetedUsd": 822392.43, "grants": 5, "lastPaid": "2026-08-03"},
    forumTopics: [{ id: 53686, title: "ZecHub 2026", kind: "report" }, { id: 56030, title: "ZecHub DAO — Proposal A149: Phase 1 Progress Report", kind: "report" }],
    about: "The community-owned education DAO: wiki, bounties, and the umbrella funding regional ambassadors from its own treasury.",
  },
  {
    id: "zcash-brazil",
    name: "Zcash Brazil",
    country: "Brazil",
    flag: "🇧🇷",
    region: "Latin America",
    language: "Portuguese",
    links: {"x": "https://x.com/zcashbrazil", "forumUser": "Michae2xl"},
    zcg: {"funded": true, "recipient": "Zcash Brazil", "budgetedUsd": 655955.43, "grants": 7, "lastPaid": "2026-08-03"},
    forumTopics: [{ id: 53702, title: "Zcash Brazil | 2026", kind: "report" }, { id: 49458, title: "Zcash Brazil | 2025", kind: "report" }, { id: 54628, title: "ZECA: The Shielded Voice", kind: "announcement" }],
    about: "The largest regional community in the ZCG ledger: education, events, ZECA voice assistant, and monthly public reports since 2023.",
  },
  {
    id: "zk-av-club",
    name: "ZK AV Club",
    country: "Global",
    flag: "🌐",
    region: "Global",
    language: "English",
    links: {"x": "https://x.com/ZkAv_Club", "forumUser": "ryan.taylor"},
    zcg: {"funded": true, "recipient": "ZK AV Club", "budgetedUsd": 288545, "grants": 2, "lastPaid": "2026-08-03"},
    forumTopics: [{ id: 53913, title: "Zcash Community Media Infrastructure & Support | Zk Av Club 2026", kind: "report" }, { id: 43733, title: "Zero-knowledge Audiovisual Club", kind: "thread" }],
    about: "Community media infrastructure: audiovisual production, streaming support and creator tooling for the whole ecosystem.",
  },
  {
    id: "zcash-en-espanol",
    name: "Zcash en Español",
    country: "Hispanic America & Spain",
    flag: "🌎",
    region: "Latin America",
    language: "Spanish",
    links: {"site": "https://zcashesp.com", "forumUser": "yoditar"},
    zcg: {"funded": true, "recipient": "Zcash Español", "budgetedUsd": 195600, "grants": 4, "lastPaid": "2026-08-06"},
    forumTopics: [{ id: 53815, title: "Zcash Global en Español 2026", kind: "report" }, { id: 55685, title: "Zcash en Español X account suspended", kind: "announcement" }, { id: 55530, title: "The Spanish-speaking Zcash community now has its own node!", kind: "announcement" }],
    about: "The Spanish-speaking hub (now on Bluesky after an X suspension): news, education, its own node, and a family of local clubs.",
  },
  {
    id: "zcash-turkiye",
    name: "Zcash Türkiye",
    country: "Türkiye",
    flag: "🇹🇷",
    region: "Europe",
    language: "Turkish",
    links: {"x": "https://x.com/ZcashTR", "forumUser": "Batuhan"},
    zcg: {"funded": true, "recipient": "Batuhan", "budgetedUsd": 133070, "grants": 8, "lastPaid": "2026-08-19"},
    forumTopics: [{ id: 56274, title: "Zcash Türkiye 2026 Q3-4 - 2027 Q1-2-3-4", kind: "application" }, { id: 57087, title: "We Need Support with a Testnet ZEC Faucet", kind: "announcement" }, { id: 56903, title: "From Street Interviews to Education: Growing Zcash Awareness in Türkiye", kind: "report" }],
    about: "Street interviews to bootcamps: education and events across Türkiye, with the most recent ledger payment of any community.",
  },
  {
    id: "zcash-nigeria",
    name: "Zcash Nigeria",
    country: "Nigeria",
    flag: "🇳🇬",
    region: "Africa",
    language: "English",
    links: {"x": "https://x.com/ZcashNigeria", "forumUser": "lisa001"},
    zcg: {"funded": true, "recipient": "Zcash Nigeria", "budgetedUsd": 103800, "grants": 5, "lastPaid": "2026-08-03"},
    forumTopics: [{ id: 53654, title: "Zcash Nigeria 2026", kind: "report" }, { id: 56291, title: "University of Ibadan Zcash Bootcamp", kind: "announcement" }],
    about: "Six consecutive ZCG grants of campus bootcamps and meetups across Nigeria.",
  },
  {
    id: "zcash-ghana",
    name: "Zcash Ghana",
    country: "Ghana",
    flag: "🇬🇭",
    region: "Africa",
    language: "English",
    links: {"forumUser": "ogasky"},
    zcg: {"funded": true, "recipient": "ZcashGH", "budgetedUsd": 25200, "grants": 2, "lastPaid": "2026-08-17"},
    forumTopics: [{ id: 57023, title: "Big things ahead for Zcash Ghana", kind: "announcement" }, { id: 56214, title: "Zcash Ghana (July 2026 - September 2026)", kind: "application" }, { id: 56792, title: "Zcash Ghana — Our First Year Journey (June 2025 – June 2026)", kind: "report" }],
    about: "Community education and meetups; two ZCG grants delivered.",
  },
  {
    id: "zcash-arabia",
    name: "Zcash Arabia",
    country: "MENA region",
    flag: "🕌",
    region: "Middle East",
    language: "Arabic",
    links: {"x": "https://x.com/ZcashArabia", "forumUser": "ZArabia"},
    zcg: {"funded": true, "recipient": "ZcashArabia", "budgetedUsd": 11500, "grants": 2, "lastPaid": "2026-05-27"},
    forumTopics: [{ id: 56866, title: "Grant Application - Zcash Arabia (August to December 2026)", kind: "application" }, { id: 56580, title: "Zcash Arabia (June to September 2026)", kind: "report" }],
    about: "Arabic-language content and community building across the MENA region.",
  },
  {
    id: "club-zcash-barcelona",
    name: "Club Zcash Barcelona",
    country: "Spain",
    flag: "🇪🇸",
    region: "Europe",
    language: "Spanish/Catalan",
    links: {"forumUser": "gordonesTV"},
    zcg: {"funded": false},
    forumTopics: [{ id: 51247, title: "Club Zcash Barcelona, the journey begins!", kind: "thread" }],
    about: "Local club in the Zcash en Español orbit, running Barcelona meetups.",
  },
  {
    id: "coderaiz-mexico",
    name: "CodeRaiz México",
    country: "Mexico",
    flag: "🇲🇽",
    region: "Latin America",
    language: "Spanish",
    links: {"forumUser": "savinocalebresi"},
    zcg: {"funded": false},
    forumTopics: [{ id: 55506, title: "Zcash University Outreach Initiative – Mexico 2026 (CodeRaiz Proposal)", kind: "application" }],
    about: "Developer-focused education in Mexico, in the Español ecosystem.",
  },
  {
    id: "pesa-ya-siri-zcash-tanzania",
    name: "Pesa Ya Siri (Zcash Tanzania)",
    country: "Tanzania",
    flag: "🇹🇿",
    region: "Africa",
    language: "Swahili/English",
    links: {"forumUser": "clemencedouglas"},
    zcg: {"funded": false},
    forumTopics: [{ id: 56593, title: "What If Buying Zcash Was as Easy as Buying Airtime?", kind: "thread" }, { id: 55558, title: "Pesa Ya Siri: Making Zcash a Household Name in Tanzania", kind: "application" }],
    about: "Swahili-language education in Tanzania; proposals so far unfunded by the ZecHub DAO.",
  },
  {
    id: "ruzcash",
    name: "ruZcash",
    country: "Russia & CIS",
    flag: "🇷🇺",
    region: "Europe",
    language: "Russian",
    links: {"x": "https://x.com/ruZCASH", "site": "https://pro.zcash.ru", "forumUser": "artkor"},
    zcg: {"funded": false},
    forumTopics: [{ id: 38485, title: "Русскоязычный блог pro.zcash.ru", kind: "thread" }, { id: 55305, title: "Кошелёк Zodl больше недоступен в российских магазинах приложений", kind: "announcement" }, { id: 53449, title: "Artkor aka ruzcash for ZCG (December 2025) — candidatura ao comitê", kind: "thread" }],
    about: "Russian-language content, translations and community for the CIS region.",
  },
  {
    id: "zcash-china",
    name: "Zcash China",
    country: "China",
    flag: "🇨🇳",
    region: "Asia",
    language: "Chinese",
    links: {"forumUser": "ZcashChina"},
    zcg: {"funded": false},
    forumTopics: [{ id: 33064, title: "On the Operation and Promotion of Zcash Community in China (2019, 16 posts)", kind: "thread" }, { id: 56438, title: "Zcash China 还有人吗? 想交流 (chamado por reativação)", kind: "thread" }],
    about: "Chinese-language content and translations for the Zcash ecosystem.",
  },
  {
    id: "zcash-club-queretaro",
    name: "Zcash Club Querétaro",
    country: "Mexico",
    flag: "🇲🇽",
    region: "Latin America",
    language: "Spanish",
    links: {"x": "https://x.com/zcashqro", "forumUser": "palmar"},
    zcg: {"funded": false},
    forumTopics: [{ id: 55764, title: "Zcash Club Querétaro-Mexico: advancing financial privacy in Mexico", kind: "thread" }, { id: 56305, title: "Mandatory ID registration on mobile lines in Mexico: the role of Zcash in México", kind: "announcement" }],
    about: "Local Mexican club in the Español ecosystem, running Querétaro meetups.",
  },
  {
    id: "zcash-east-africa",
    name: "Zcash East Africa",
    country: "East Africa",
    flag: "🌍",
    region: "Africa",
    language: "English/Swahili",
    links: {"x": "https://x.com/ZcashEastAfrica", "forumUser": "Z.cash.EastAfrica"},
    zcg: {"funded": false},
    forumTopics: [{ id: 57144, title: "Zcash East Africa @ ETHSafari 2026", kind: "announcement" }, { id: 56405, title: "Zcash East Africa (June-July 2026)", kind: "report" }, { id: 55860, title: "Zcash East Africa Official Launch & Community Onboarding Meetup", kind: "announcement" }],
    about: "Grassroots education in Uganda and Kenya, funded through ZecHub DAO proposals.",
  },
  {
    id: "zcash-for-venezuela",
    name: "Zcash for Venezuela",
    country: "Venezuela",
    flag: "🇻🇪",
    region: "Latin America",
    language: "Spanish",
    links: {"forumUser": "gordonesTV"},
    zcg: {"funded": true, "note": "Funded through the Zcash en Español ZCG grant — part of its ecosystem (no separate ledger recipient)."},
    forumTopics: [{ id: 56445, title: "Zcash for Venezuela!", kind: "thread" }],
    about: "Adoption advocacy where financial privacy is a daily necessity.",
  },
  {
    id: "zcash-france",
    name: "Zcash France",
    country: "France",
    flag: "🇫🇷",
    region: "Europe",
    language: "French",
    links: {},
    zcg: {"funded": false},
    forumTopics: [{ id: 5544, title: "The French Corner / Le coin des Français", kind: "thread" }],
    about: "French-language community and content.",
  },
  {
    id: "zcash-global-germany",
    name: "Zcash Global Germany",
    country: "Germany",
    flag: "🇩🇪",
    region: "Europe",
    language: "German",
    links: {"forumUser": "HHIROSHIMA"},
    zcg: {"funded": false},
    forumTopics: [{ id: 50169, title: "Zcash Global Germany", kind: "announcement" }],
    about: "German-language community and content.",
  },
  {
    id: "zcash-india",
    name: "Zcash India",
    country: "India",
    flag: "🇮🇳",
    region: "Asia",
    language: "Hindi/English",
    links: {"forumUser": "jatinsahijwani"},
    zcg: {"funded": false, "note": "Funded via the ZecHub DAO treasury, not the ZCG ledger."},
    forumTopics: [{ id: 54762, title: "Zcash India 2026", kind: "announcement" }, { id: 56847, title: "Open Light Nodes: Independent Zcash Light Client Infrastructure for Asia", kind: "application" }, { id: 54544, title: "Zcash India 2026 Grant Application", kind: "application" }],
    about: "Education and meetups in India, funded as a ZecHub DAO ambassador program.",
  },
  {
    id: "zcash-indonesia",
    name: "Zcash Indonesia",
    country: "Indonesia",
    flag: "🇮🇩",
    region: "Asia",
    language: "Bahasa Indonesia",
    links: {},
    zcg: {"funded": false},
    forumTopics: [{ id: 38678, title: "Zcash Untuk Nusantara (post único, 2021)", kind: "thread" }],
    about: "Bahasa Indonesia content and community, in the QRIS offramp corridor.",
  },
  {
    id: "zcash-japan",
    name: "Zcash Japan",
    country: "Japan",
    flag: "🇯🇵",
    region: "Asia",
    language: "Japanese",
    links: {"forumUser": "ryu963"},
    zcg: {"funded": false},
    forumTopics: [{ id: 54827, title: "Strategic Lobbying and Community Building for the Proliferation and Understanding of Zcash in Japan", kind: "application" }],
    about: "Japanese-language community and translations.",
  },
  {
    id: "zcash-korea",
    name: "Zcash Korea",
    country: "South Korea",
    flag: "🇰🇷",
    region: "Asia",
    language: "Korean",
    links: {"forumUser": "AidenZ"},
    zcg: {"funded": false, "note": "Funded via the ZecHub DAO treasury, not the ZCG ledger."},
    forumTopics: [{ id: 56458, title: "Zechub DAO - 2026 Zcash Korea Ambassador Proposal (Approved)", kind: "application" }, { id: 50498, title: "Zechub DAO - Zcash Korea Ambassador Proposal (Approved) — edição 2025", kind: "application" }],
    about: "Korean community, funded as a ZecHub DAO Global Ambassador program.",
  },
  {
    id: "zcash-ukraine",
    name: "Zcash Ukraine",
    country: "Ukraine",
    flag: "🇺🇦",
    region: "Europe",
    language: "Ukrainian",
    links: {"x": "https://x.com/Zcash_ua", "telegram": "https://t.me/zcash_ua", "forumUser": "beyond"},
    zcg: {"funded": false, "note": "Funded via the ZecHub DAO treasury, not the ZCG ledger."},
    forumTopics: [{ id: 54059, title: "Zcash Ukraine – Monthly Report (December 1–31, 2025) — último da série mensal iniciada em jun/2025", kind: "report" }, { id: 52330, title: "Zcash Ukraine Regional Community Initiative", kind: "application" }],
    about: "Ukrainian community and education under wartime conditions.",
  },
  {
    id: "zcashsa-zcash-south-africa",
    name: "ZcashSA (Zcash South Africa)",
    country: "South Africa",
    flag: "🇿🇦",
    region: "Africa",
    language: "English",
    links: {"x": "https://x.com/Zcash_SA", "telegram": "https://t.me/zcashSA", "forumUser": "Inspire_s"},
    zcg: {"funded": false},
    forumTopics: [{ id: 57133, title: "Support ZcashSA", kind: "announcement" }, { id: 56576, title: "Zcash first community event in Pretoria, SA", kind: "announcement" }, { id: 55706, title: "Privacy has landed in South Africa! Join in", kind: "announcement" }],
    about: "South African community education and meetups.",
  },
  {
    id: "zcast",
    name: "Zcast",
    country: "Global",
    flag: "🎙️",
    region: "Global",
    language: "Spanish",
    links: {"x": "https://x.com/ZcastEsp"},
    zcg: {"funded": false},
    forumTopics: [{ id: 54291, title: "Zcast, the Zcash podcast in Spanish - A new phase", kind: "announcement" }, { id: 44447, title: "Zcast, el podcast de Zcash en Español", kind: "thread" }],
    about: "The Spanish-language Zcash podcast, in the Español ecosystem.",
  },
];
