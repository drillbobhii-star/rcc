CREATE TABLE "workbench_preferences" (
	"id" uuid PRIMARY KEY,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"profiles" text[] DEFAULT '{}'::text[] NOT NULL
);
