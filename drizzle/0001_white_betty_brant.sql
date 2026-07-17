CREATE TABLE "zcg_changelog" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"from_val" text,
	"to_val" text,
	"detail" text
);
