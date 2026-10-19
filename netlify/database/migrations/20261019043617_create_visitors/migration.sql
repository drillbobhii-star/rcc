CREATE TABLE "visitors" (
	"id" uuid PRIMARY KEY,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
