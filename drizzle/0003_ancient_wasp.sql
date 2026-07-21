CREATE TABLE "zechub_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"snapshot_id" text NOT NULL,
	"category" text NOT NULL,
	"zec_zat" bigint,
	"share_pct" double precision
);
--> statement-breakpoint
CREATE TABLE "zechub_payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"paid_usd_cents" bigint,
	"pending_usd_cents" bigint,
	"m1" text,
	"m2" text,
	"m3" text,
	"zec_paid_zat" bigint,
	"captured_on" date,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zechub_treasury_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"captured_on" date NOT NULL,
	"zec_price_cents" bigint,
	"donations_zat" bigint,
	"donations_usd_cents" bigint,
	"fpf_zat" bigint,
	"fpf_usd_cents" bigint,
	"fpf_unreserved_zat" bigint,
	"fpf_reserved_usd_cents" bigint,
	"inc_zat" bigint,
	"inc_usd_cents" bigint,
	"penumbra_um" double precision,
	"namada_nam" double precision,
	"total_paid_out_usd_cents" bigint,
	"to_be_paid_out_usd_cents" bigint,
	"content_sha256" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zechub_allocations" ADD CONSTRAINT "zechub_allocations_snapshot_id_zechub_treasury_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."zechub_treasury_snapshots"("id") ON DELETE cascade ON UPDATE no action;