CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"script_id" text NOT NULL,
	"user_id" text NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_body_length" CHECK (char_length("body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text,
	"script_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_pkey" PRIMARY KEY("user_id","script_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"user_id" text,
	"script_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_pkey" PRIMARY KEY("user_id","script_id")
);
--> statement-breakpoint
CREATE INDEX "comments_script_date_idx" ON "comments" ("script_id","created_at");--> statement-breakpoint
CREATE INDEX "votes_script_idx" ON "votes" ("script_id");