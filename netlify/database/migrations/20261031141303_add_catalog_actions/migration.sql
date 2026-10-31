CREATE TABLE "catalog_actions" (
	"visitor_id" uuid,
	"script_id" text,
	"action" text,
	"day" text,
	CONSTRAINT "catalog_actions_pkey" PRIMARY KEY("visitor_id","script_id","action","day"),
	CONSTRAINT "catalog_actions_type" CHECK ("action" in ('copy', 'download'))
);
--> statement-breakpoint
CREATE INDEX "catalog_actions_script_idx" ON "catalog_actions" ("script_id");