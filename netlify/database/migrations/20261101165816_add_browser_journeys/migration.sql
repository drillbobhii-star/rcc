CREATE TABLE "browser_journeys" (
	"id" uuid PRIMARY KEY,
	"completed" boolean DEFAULT false NOT NULL,
	"state" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
