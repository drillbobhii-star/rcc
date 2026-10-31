CREATE TABLE "script_copies" (
	"script_id" text,
	"visitor_id" uuid,
	"day" date DEFAULT CURRENT_DATE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "script_copies_pkey" PRIMARY KEY("script_id","visitor_id","day")
);
--> statement-breakpoint
CREATE INDEX "script_copies_date_idx" ON "script_copies" ("created_at");