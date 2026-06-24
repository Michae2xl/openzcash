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
CREATE TABLE "project_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"project_name" text NOT NULL,
	"payment_kind" text DEFAULT 'grant' NOT NULL,
	"zkool_account_id" integer,
	"ufvk_fingerprint" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"source_sheet_gid" text NOT NULL,
	"source_row_index" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "chain_outputs" DROP CONSTRAINT "chain_outputs_txid_chain_txs_txid_fk";
--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'chain_txs'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "chain_txs" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "chain_txs" ADD CONSTRAINT "chain_txs_treasury_id_txid_pk" PRIMARY KEY("treasury_id","txid");--> statement-breakpoint
ALTER TABLE "chain_outputs" ADD COLUMN "treasury_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "chain_txs" ADD COLUMN "treasury_id" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "viewing_keys" ADD COLUMN "treasury_type" text DEFAULT 'outro' NOT NULL;--> statement-breakpoint
ALTER TABLE "viewing_keys" ADD COLUMN "balance_zat" bigint;--> statement-breakpoint
ALTER TABLE "viewing_keys" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "viewing_keys" ADD COLUMN "birth_height" integer;--> statement-breakpoint
ALTER TABLE "derived_addresses" ADD CONSTRAINT "derived_addresses_project_id_project_recipients_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project_recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zcg_disbursements" ADD CONSTRAINT "zcg_disbursements_recipient_id_project_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."project_recipients"("id") ON DELETE no action ON UPDATE no action;