CREATE TABLE "chain_outputs" (
	"id" text PRIMARY KEY NOT NULL,
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
	"txid" text PRIMARY KEY NOT NULL,
	"block_height" integer NOT NULL,
	"block_time" timestamp with time zone NOT NULL,
	"pool" text NOT NULL,
	"fee_zat" bigint NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "chain_outputs" ADD CONSTRAINT "chain_outputs_txid_chain_txs_txid_fk" FOREIGN KEY ("txid") REFERENCES "public"."chain_txs"("txid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vk_access_log" ADD CONSTRAINT "vk_access_log_viewing_key_id_viewing_keys_id_fk" FOREIGN KEY ("viewing_key_id") REFERENCES "public"."viewing_keys"("id") ON DELETE no action ON UPDATE no action;