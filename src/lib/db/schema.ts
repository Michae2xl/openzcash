/**
 * Schema Drizzle (PostgreSQL) para a auditoria read-only.
 *
 * Valores em zatoshis são `bigint` (Postgres bigint = int64; cabe a oferta máxima
 * de ZEC com folga). Memos brutos são guardados em base64 (`memo_b64`) — decodificados
 * na leitura. Camadas separadas: chave de visualização, raw on-chain, e estado de scan.
 */

import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const viewingKeys = pgTable("viewing_keys", {
  id: text("id").primaryKey(),
  accountLabel: text("account_label").notNull(),
  kind: text("kind").notNull(), // "ufvk" | "uivk"
  pools: text("pools").array().notNull(),
  ufvkMasked: text("ufvk_masked").notNull(),
  /** UFVK cifrada at-rest (nunca em claro). Null no mock. */
  ufvkEncrypted: text("ufvk_encrypted"),
  scope: text("scope").notNull(),
  status: text("status").notNull().default("active"),
  /** Tipo do tesouro: grants | folha | distribuicao | pessoal | outro. */
  treasuryType: text("treasury_type").notNull().default("outro"),
  /** Exposto na visão PÚBLICA (comunidade). Default false: privado por design. */
  isPublic: boolean("is_public").notNull().default(false),
  /** Saldo real on-chain (zatoshis); null quando a engine não fornece. */
  balanceZat: bigint("balance_zat", { mode: "bigint" }),
  /** Endereço transparente (t1/t3) quando kind="taddr"; null p/ viewing keys. */
  address: text("address"),
  /** Altura inicial do scan (birthday) — usada p/ tesouros transparentes. */
  birthHeight: integer("birth_height"),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Convites de onboarding: link compartilhável p/ terceiros cadastrarem um tesouro. */
export const onboardingInvites = pgTable("onboarding_invites", {
  token: text("token").primaryKey(),
  label: text("label").notNull(),
  status: text("status").notNull().default("pending"), // pending | used | revoked
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
  /** Tesouro criado a partir deste convite (viewing_keys.id). */
  treasuryId: text("treasury_id"),
});

/** Projeto que RECEBE (grant/bounty): 1 UFVK → N endereços derivados (1 por mês). */
export const projectRecipients = pgTable("project_recipients", {
  id: text("id").primaryKey(),
  projectName: text("project_name").notNull(),
  /** "grant" | "bounty" — categoria padrão dos recebimentos deste projeto. */
  paymentKind: text("payment_kind").notNull().default("grant"),
  /** Conta watch-only no zkool (de onde derivamos e escaneamos). */
  zkoolAccountId: integer("zkool_account_id"),
  /** Fingerprint (sha256 hex) da UFVK — identificador seguro de expor. */
  ufvkFingerprint: text("ufvk_fingerprint"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Endereço diversificado derivado de um projeto, fixado a um mês (issued_month). */
export const derivedAddresses = pgTable(
  "derived_addresses",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projectRecipients.id),
    /** UNIQUE = detecção de colisão (um endereço nunca serve a 2 meses/projetos). */
    address: text("address").notNull().unique(),
    diversifierIndex: bigint("diversifier_index", { mode: "bigint" }).notNull(),
    issuedMonth: text("issued_month").notNull(), // YYYY-MM
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.projectId, t.issuedMonth)],
);

/** Re-classificação MANUAL de uma transação (override sobre a auto-classificação). */
export const classificationOverrides = pgTable(
  "classification_overrides",
  {
    id: text("id").primaryKey(),
    treasuryId: text("treasury_id").notNull(),
    txid: text("txid").notNull(),
    classification: text("classification").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.treasuryId, t.txid)],
);

export const vkAccessLog = pgTable("vk_access_log", {
  id: text("id").primaryKey(),
  viewingKeyId: text("viewing_key_id")
    .notNull()
    .references(() => viewingKeys.id),
  principal: text("principal").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  scope: text("scope").notNull(),
  reason: text("reason").notNull(),
});

export const chainTxs = pgTable(
  "chain_txs",
  {
    txid: text("txid").notNull(),
    blockHeight: integer("block_height").notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }).notNull(),
    pool: text("pool").notNull(),
    feeZat: bigint("fee_zat", { mode: "bigint" }).notNull(),
    /** Tesouro (viewing key) dono desta transação. */
    treasuryId: text("treasury_id").notNull().default("default"),
    scannedAt: timestamp("scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // PK composta: a MESMA txid pode ser vista por vários tesouros (ex.: transferência
  // interna entre duas viewing keys do mesmo dono — remetente e destinatário).
  (t) => [primaryKey({ columns: [t.treasuryId, t.txid] })],
);

export const chainOutputs = pgTable("chain_outputs", {
  /** `${treasuryId}:${txid}:${idx}` */
  id: text("id").primaryKey(),
  treasuryId: text("treasury_id").notNull().default("default"),
  txid: text("txid").notNull(),
  idx: integer("idx").notNull(),
  pool: text("pool").notNull(),
  direction: text("direction").notNull(), // "in" | "out" | "change"
  valueZat: bigint("value_zat", { mode: "bigint" }).notNull(),
  address: text("address"),
  /** base64 do memo bruto (≤512 bytes); null em output transparente. */
  memoB64: text("memo_b64"),
  decryptedVia: text("decrypted_via").notNull(), // "ivk" | "ovk" | "none"
});

export const paychecks = pgTable("paychecks", {
  id: text("id").primaryKey(),
  payslipId: text("payslip_id").notNull(),
  employeeLabel: text("employee_label").notNull(),
  period: text("period").notNull(),
  amountZat: bigint("amount_zat", { mode: "bigint" }).notNull(),
  expectedTxid: text("expected_txid"),
  accountCode: text("account_code").notNull(),
});

/** Estado do scan incremental (linha única "singleton"). */
export const scanState = pgTable("scan_state", {
  id: text("id").primaryKey(),
  lastScannedHeight: integer("last_scanned_height").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Integração com a planilha pública do ZCG (Zcash Community Grants).
// Contabilidade oficial de grants do ecossistema, importada via export CSV.
// ─────────────────────────────────────────────────────────────────────────────

/** Auditoria/idempotência do importador: 1 linha por (aba, conteúdo). */
export const zcgSheetImports = pgTable(
  "zcg_sheet_imports",
  {
    id: text("id").primaryKey(),
    sheetGid: text("sheet_gid").notNull(),
    /** disbursement | proposal | snapshot | totals | live */
    sheetGroup: text("sheet_group").notNull(),
    contentSha256: text("content_sha256").notNull(),
    rowCount: integer("row_count").notNull(),
    /** ok | updates_required | unknown (emoji removido do banner Status). */
    sheetStatus: text("sheet_status"),
    parsedOk: boolean("parsed_ok").notNull().default(false),
    error: text("error"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.sheetGid, t.contentSha256)],
);

/**
 * Ledger off-chain unificado de desembolsos das 5 abas de pagamento
 * (Grants Disbursed, IC Payments, Coinholder Grants, Discretionary+Bounties,
 * Monthly). Núcleo do cruzamento com as saídas on-chain do Lockbox/ZCG.
 * Convenção do schema: zatoshis e centavos de USD em `bigint`.
 */
export const zcgDisbursements = pgTable("zcg_disbursements", {
  /** Hash determinístico do conteúdo — upsert idempotente. */
  id: text("id").primaryKey(),
  /** grants_disbursed | ic_payments | coinholder_grants | discretionary | monthly */
  sourceSheet: text("source_sheet").notNull(),
  disbursementType: text("disbursement_type").notNull(),
  project: text("project"),
  recipientNameRaw: text("recipient_name_raw").notNull(),
  /** lower+trim+collapse-space — chave de join fuzzy. */
  recipientKey: text("recipient_key").notNull(),
  recipientId: text("recipient_id").references(() => projectRecipients.id),
  deliverable: text("deliverable"),
  category: text("category"),
  reportingFrequency: text("reporting_frequency"),
  milestoneLabel: text("milestone_label"),
  milestoneSeq: integer("milestone_seq"),
  /** ZEC | USD | USDC */
  settlementAsset: text("settlement_asset").notNull().default("ZEC"),
  amountUsdCents: bigint("amount_usd_cents", { mode: "bigint" }),
  usdDisbursedCents: bigint("usd_disbursed_cents", { mode: "bigint" }),
  /** Pode ser NEGATIVO (clawback / funds returned). */
  zecDisbursedZat: bigint("zec_disbursed_zat", { mode: "bigint" }),
  usdDisbursedZecRateCents: bigint("usd_disbursed_zec_rate_cents", {
    mode: "bigint",
  }),
  paidOutDate: date("paid_out_date"),
  /** Preserva condições textuais ("2 months after merge"). */
  paidOutRaw: text("paid_out_raw").notNull().default(""),
  estimatedPayoutDate: date("estimated_payout_date"),
  forMonth: text("for_month"),
  grantStatus: text("grant_status"),
  isTest: boolean("is_test").notNull().default(false),
  isPaid: boolean("is_paid").notNull().default(false),
  isInternal: boolean("is_internal").notNull().default(false),
  /** Null para linhas autorais do admin (não vêm de uma aba da planilha). */
  sourceSheetGid: text("source_sheet_gid"),
  sourceRowIndex: integer("source_row_index"),
  /** 'sheet' = espelho da planilha (apagável no import) | 'admin' = autoral. */
  origin: text("origin").notNull().default("sheet"),
  /** Admin travou esta linha: o import não a apaga nem sobrescreve. */
  locked: boolean("locked").notNull().default(false),
  importedAt: timestamp("imported_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Log de auditoria/reverter das edições do admin em desembolsos. A edição é
 * MATERIALIZADA na própria linha (UPDATE + locked) para refletir nas agregações
 * SQL (Grants/Recebedores/Totais); aqui guardamos o patch + os valores originais
 * (para reverter) + o motivo. Chaveado pelo id estável do desembolso.
 */
export const zcgDisbursementOverrides = pgTable("zcg_disbursement_overrides", {
  id: text("id").primaryKey(),
  disbursementId: text("disbursement_id").notNull().unique(),
  /** { campo: valorNovo } — serializado (bigints/datas como string). */
  patch: jsonb("patch").notNull(),
  /** { campo: valorAntigo } — para reverter. */
  original: jsonb("original").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Fase 2: liga uma saída on-chain do Lockbox/ZCG a 1..N milestones pagos. ──
export const zcgReconciliationLinks = pgTable(
  "zcg_reconciliation_links",
  {
    id: text("id").primaryKey(),
    treasuryId: text("treasury_id").notNull(),
    txid: text("txid").notNull(),
    outputIdx: integer("output_idx"),
    disbursementId: text("disbursement_id")
      .notNull()
      .references(() => zcgDisbursements.id),
    /** exact_date_zec | date_window_zec | amount_split | manual */
    matchKind: text("match_kind").notNull(),
    confidenceBps: integer("confidence_bps").notNull(),
    zecMatchedZat: bigint("zec_matched_zat", { mode: "bigint" }).notNull(),
    /** auto | confirmed | rejected */
    status: text("status").notNull().default("auto"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.treasuryId, t.txid, t.disbursementId)],
);

// ── Fase 3: snapshot ao vivo de saldo (série temporal por escopo). ──
export const zcgBalanceSnapshots = pgTable(
  "zcg_balance_snapshots",
  {
    id: text("id").primaryKey(),
    /** zcg_operating | lockbox_coinholder | overview_reconciliation | maya_liquidity */
    scope: text("scope").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    blockHeight: bigint("block_height", { mode: "bigint" }),
    blockTime: timestamp("block_time", { withTimezone: true }),
    status: text("status"),
    zecBalanceZat: bigint("zec_balance_zat", { mode: "bigint" }),
    usdCashBalanceCents: bigint("usd_cash_balance_cents", { mode: "bigint" }),
    zecusdPriceCents: bigint("zecusd_price_cents", { mode: "bigint" }),
    usdValueOfZecCents: bigint("usd_value_of_zec_cents", { mode: "bigint" }),
    usdTotalHoldingsCents: bigint("usd_total_holdings_cents", {
      mode: "bigint",
    }),
    usdGrantsApprovedCents: bigint("usd_grants_approved_cents", {
      mode: "bigint",
    }),
    usdMilestonesPaidCents: bigint("usd_milestones_paid_cents", {
      mode: "bigint",
    }),
    futureGrantLiabilitiesCents: bigint("future_grant_liabilities_cents", {
      mode: "bigint",
    }),
    zecReceivablesZat: bigint("zec_receivables_zat", { mode: "bigint" }),
    sourceSheetGid: text("source_sheet_gid").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.scope, t.capturedAt)],
);

// ── Fase 3: bloco de orçamento discricionário (USD e ZEC divergem). ──
export const zcgBudgetSnapshots = pgTable(
  "zcg_budget_snapshots",
  {
    id: text("id").primaryKey(),
    sourceSheet: text("source_sheet").notNull(),
    /** annual_budget | spent_to_date | budget_remaining */
    label: text("label").notNull(),
    usdCents: bigint("usd_cents", { mode: "bigint" }),
    zecZat: bigint("zec_zat", { mode: "bigint" }),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  },
  (t) => [unique().on(t.label, t.capturedAt)],
);

// ── Fase 3: aportes à LP Maya/THORChain (CACAO em unidade base própria). ──
export const zcgMayaTransfers = pgTable("zcg_maya_transfers", {
  id: text("id").primaryKey(),
  project: text("project"),
  amountUsdCents: bigint("amount_usd_cents", { mode: "bigint" }),
  transferredAt: date("transferred_at"),
  zecTransferredZat: bigint("zec_transferred_zat", { mode: "bigint" }),
  zecUsdPriceCents: bigint("zec_usd_price_cents", { mode: "bigint" }),
});

// ── Fase 4: pipeline de governança (propostas → grants). NÃO é gasto. ──
export const zcgProposals = pgTable(
  "zcg_proposals",
  {
    id: text("id").primaryKey(),
    /** zcg | coinholder */
    program: text("program").notNull(),
    /** id extraído do Grant Platform Link (join estável com grant). */
    proposalExtId: text("proposal_ext_id"),
    title: text("title").notNull(),
    /** normalizeKey(title) — join fuzzy com project. */
    titleKey: text("title_key").notNull(),
    applicantsRaw: text("applicants_raw"),
    submittedDate: date("submitted_date"),
    /** approved|rejected|withdrawn|cancelled|filtered|pending|under_review|vetoed */
    status: text("status").notNull(),
    statusRaw: text("status_raw").notNull(),
    decisionDate: date("decision_date"),
    decisionTurnaroundDays: integer("decision_turnaround_days"),
    requestedUsdCents: bigint("requested_usd_cents", { mode: "bigint" }),
    platformLink: text("platform_link"),
    forumLink: text("forum_link"),
    conditionNotes: text("condition_notes"),
    country: text("country"),
    orgOrIndividual: text("org_or_individual"),
    /** Null para linhas autorais do admin (não vêm de uma aba da planilha). */
    sourceSheetGid: text("source_sheet_gid"),
    sourceRowIndex: integer("source_row_index"),
    /** 'sheet' = espelho da planilha (apagável no import) | 'admin' = autoral. */
    origin: text("origin").notNull().default("sheet"),
    /** Admin travou esta linha: o import não a apaga nem sobrescreve. */
    locked: boolean("locked").notNull().default(false),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.program, t.sourceSheetGid, t.sourceRowIndex)],
);

// ── Fase 4: totais agregados (integrity-check do ledger). ──
export const zcgTotals = pgTable(
  "zcg_totals",
  {
    id: text("id").primaryKey(),
    /** zcg_grants | coinholder */
    pool: text("pool").notNull(),
    /** recipient_total | classification_total | grand_total */
    rowKind: text("row_kind").notNull(),
    label: text("label").notNull(),
    category: text("category"),
    usdPaidToDateCents: bigint("usd_paid_to_date_cents", {
      mode: "bigint",
    }).notNull(),
    usdFuturePipelineCents: bigint("usd_future_pipeline_cents", {
      mode: "bigint",
    }),
    isInternalBucket: boolean("is_internal_bucket").notNull().default(false),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    sourceSheetGid: text("source_sheet_gid").notNull(),
  },
  (t) => [unique().on(t.pool, t.rowKind, t.label, t.capturedAt)],
);

// ── Governança editável pelo admin (substitui os arrays hardcoded em TS). ──

/** Atas das reuniões do ZCG (links do fórum). */
export const zcgMeetings = pgTable("zcg_meetings", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  meetingDate: date("meeting_date").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Eleições do comitê ZCG (atual + passadas). */
export const zcgElections = pgTable("zcg_elections", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  /** voting | closed */
  status: text("status").notNull(),
  seats: integer("seats").notNull().default(1),
  url: text("url").notNull(),
  nominationsClose: date("nominations_close"),
  communityCall: date("community_call"),
  votingCloses: date("voting_closes"),
  resultsBy: date("results_by"),
  /** Array de nomes eleitos (jsonb). */
  elected: jsonb("elected"),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Links de configuração (submissão de propostas, fórum, form do CryptPad). */
export const zcgLinks = pgTable("zcg_links", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
