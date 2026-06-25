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
ALTER TABLE "zcg_disbursements" ALTER COLUMN "source_sheet_gid" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "zcg_disbursements" ALTER COLUMN "source_row_index" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project_recipients" ADD COLUMN "scan_ref" text;--> statement-breakpoint
ALTER TABLE "viewing_keys" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "zcg_disbursements" ADD COLUMN "origin" text DEFAULT 'sheet' NOT NULL;--> statement-breakpoint
ALTER TABLE "zcg_disbursements" ADD COLUMN "locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "zcg_reconciliation_links" ADD CONSTRAINT "zcg_reconciliation_links_disbursement_id_zcg_disbursements_id_fk" FOREIGN KEY ("disbursement_id") REFERENCES "public"."zcg_disbursements"("id") ON DELETE no action ON UPDATE no action;