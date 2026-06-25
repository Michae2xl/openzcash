CREATE TABLE "chain_outputs" (
	"id" text PRIMARY KEY NOT NULL,
	"treasury_id" text DEFAULT 'default' NOT NULL,
	"txid" text NOT NULL,
	"idx" integer NOT NULL,
	"pool" text NOT NULL,
	"direction" text NOT NULL,
	"value_zat" bigint NOT NULL,
	"address" text,
	"memo_b64" text,
	"decrypted_via" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_txs" (
	"txid" text NOT NULL,
	"block_height" integer NOT NULL,
	"block_time" timestamp with time zone NOT NULL,
	"pool" text NOT NULL,
	"fee_zat" bigint NOT NULL,
	"treasury_id" text DEFAULT 'default' NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_txs_treasury_id_txid_pk" PRIMARY KEY("treasury_id","txid")
);
--> statement-breakpoint
CREATE TABLE "classification_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"treasury_id" text NOT NULL,
	"txid" text NOT NULL,
	"classification" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classification_overrides_treasury_id_txid_unique" UNIQUE("treasury_id","txid")
);
--> statement-breakpoint
CREATE TABLE "derived_addresses" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"address" text NOT NULL,
	"diversifier_index" bigint NOT NULL,
	"issued_month" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "derived_addresses_address_unique" UNIQUE("address"),
	CONSTRAINT "derived_addresses_project_id_issued_month_unique" UNIQUE("project_id","issued_month")
);
--> statement-breakpoint
CREATE TABLE "onboarding_invites" (
	"token" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"treasury_id" text
);
--> statement-breakpoint
CREATE TABLE "paychecks" (
	"id" text PRIMARY KEY NOT NULL,
	"payslip_id" text NOT NULL,
	"employee_label" text NOT NULL,
	"period" text NOT NULL,
	"amount_zat" bigint NOT NULL,
	"expected_txid" text,
	"account_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"project_name" text NOT NULL,
	"payment_kind" text DEFAULT 'grant' NOT NULL,
	"zkool_account_id" integer,
	"scan_ref" text,
	"ufvk_fingerprint" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_state" (
	"id" text PRIMARY KEY NOT NULL,
	"last_scanned_height" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewing_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"account_label" text NOT NULL,
	"kind" text NOT NULL,
	"pools" text[] NOT NULL,
	"ufvk_masked" text NOT NULL,
	"ufvk_encrypted" text,
	"scope" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"treasury_type" text DEFAULT 'outro' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"balance_zat" bigint,
	"address" text,
	"birth_height" integer,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vk_access_log" (
	"id" text PRIMARY KEY NOT NULL,
	"viewing_key_id" text NOT NULL,
	"principal" text NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"scope" text NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zcg_balance_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"block_height" bigint,
	"block_time" timestamp with time zone,
	"status" text,
	"zec_balance_zat" bigint,
	"usd_cash_balance_cents" bigint,
	"zecusd_price_cents" bigint,
	"usd_value_of_zec_cents" bigint,
	"usd_total_holdings_cents" bigint,
	"usd_grants_approved_cents" bigint,
	"usd_milestones_paid_cents" bigint,
	"future_grant_liabilities_cents" bigint,
	"zec_receivables_zat" bigint,
	"source_sheet_gid" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zcg_balance_snapshots_scope_captured_at_unique" UNIQUE("scope","captured_at")
);
--> statement-breakpoint
CREATE TABLE "zcg_budget_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"source_sheet" text NOT NULL,
	"label" text NOT NULL,
	"usd_cents" bigint,
	"zec_zat" bigint,
	"captured_at" timestamp with time zone NOT NULL,
	CONSTRAINT "zcg_budget_snapshots_label_captured_at_unique" UNIQUE("label","captured_at")
);
--> statement-breakpoint
CREATE TABLE "zcg_disbursement_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"disbursement_id" text NOT NULL,
	"patch" jsonb NOT NULL,
	"original" jsonb NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zcg_disbursement_overrides_disbursement_id_unique" UNIQUE("disbursement_id")
);
--> statement-breakpoint
CREATE TABLE "zcg_disbursements" (
	"id" text PRIMARY KEY NOT NULL,
	"source_sheet" text NOT NULL,
	"disbursement_type" text NOT NULL,
	"project" text,
	"recipient_name_raw" text NOT NULL,
	"recipient_key" text NOT NULL,
	"recipient_id" text,
	"deliverable" text,
	"category" text,
	"reporting_frequency" text,
	"milestone_label" text,
	"milestone_seq" integer,
	"settlement_asset" text DEFAULT 'ZEC' NOT NULL,
	"amount_usd_cents" bigint,
	"usd_disbursed_cents" bigint,
	"zec_disbursed_zat" bigint,
	"usd_disbursed_zec_rate_cents" bigint,
	"paid_out_date" date,
	"paid_out_raw" text DEFAULT '' NOT NULL,
	"estimated_payout_date" date,
	"for_month" text,
	"grant_status" text,
	"is_test" boolean DEFAULT false NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"source_sheet_gid" text,
	"source_row_index" integer,
	"origin" text DEFAULT 'sheet' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zcg_elections" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text NOT NULL,
	"seats" integer DEFAULT 1 NOT NULL,
	"url" text NOT NULL,
	"nominations_close" date,
	"community_call" date,
	"voting_closes" date,
	"results_by" date,
	"elected" jsonb,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zcg_links" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zcg_maya_transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"project" text,
	"amount_usd_cents" bigint,
	"transferred_at" date,
	"zec_transferred_zat" bigint,
	"zec_usd_price_cents" bigint
);
--> statement-breakpoint
CREATE TABLE "zcg_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"meeting_date" date NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zcg_proposals" (
	"id" text PRIMARY KEY NOT NULL,
	"program" text NOT NULL,
	"proposal_ext_id" text,
	"title" text NOT NULL,
	"title_key" text NOT NULL,
	"applicants_raw" text,
	"submitted_date" date,
	"status" text NOT NULL,
	"status_raw" text NOT NULL,
	"decision_date" date,
	"decision_turnaround_days" integer,
	"requested_usd_cents" bigint,
	"platform_link" text,
	"forum_link" text,
	"condition_notes" text,
	"country" text,
	"org_or_individual" text,
	"source_sheet_gid" text,
	"source_row_index" integer,
	"origin" text DEFAULT 'sheet' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zcg_proposals_program_source_sheet_gid_source_row_index_unique" UNIQUE("program","source_sheet_gid","source_row_index")
);
--> statement-breakpoint
CREATE TABLE "zcg_reconciliation_links" (
	"id" text PRIMARY KEY NOT NULL,
	"treasury_id" text NOT NULL,
	"txid" text NOT NULL,
	"output_idx" integer,
	"disbursement_id" text NOT NULL,
	"match_kind" text NOT NULL,
	"confidence_bps" integer NOT NULL,
	"zec_matched_zat" bigint NOT NULL,
	"status" text DEFAULT 'auto' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zcg_reconciliation_links_treasury_id_txid_disbursement_id_unique" UNIQUE("treasury_id","txid","disbursement_id")
);
--> statement-breakpoint
CREATE TABLE "zcg_sheet_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"sheet_gid" text NOT NULL,
	"sheet_group" text NOT NULL,
	"content_sha256" text NOT NULL,
	"row_count" integer NOT NULL,
	"sheet_status" text,
	"parsed_ok" boolean DEFAULT false NOT NULL,
	"error" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zcg_sheet_imports_sheet_gid_content_sha256_unique" UNIQUE("sheet_gid","content_sha256")
);
--> statement-breakpoint
CREATE TABLE "zcg_totals" (
	"id" text PRIMARY KEY NOT NULL,
	"pool" text NOT NULL,
	"row_kind" text NOT NULL,
	"label" text NOT NULL,
	"category" text,
	"usd_paid_to_date_cents" bigint NOT NULL,
	"usd_future_pipeline_cents" bigint,
	"is_internal_bucket" boolean DEFAULT false NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"source_sheet_gid" text NOT NULL,
	CONSTRAINT "zcg_totals_pool_row_kind_label_captured_at_unique" UNIQUE("pool","row_kind","label","captured_at")
);
--> statement-breakpoint
ALTER TABLE "derived_addresses" ADD CONSTRAINT "derived_addresses_project_id_project_recipients_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vk_access_log" ADD CONSTRAINT "vk_access_log_viewing_key_id_viewing_keys_id_fk" FOREIGN KEY ("viewing_key_id") REFERENCES "public"."viewing_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zcg_disbursements" ADD CONSTRAINT "zcg_disbursements_recipient_id_project_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."project_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zcg_reconciliation_links" ADD CONSTRAINT "zcg_reconciliation_links_disbursement_id_zcg_disbursements_id_fk" FOREIGN KEY ("disbursement_id") REFERENCES "public"."zcg_disbursements"("id") ON DELETE no action ON UPDATE no action;