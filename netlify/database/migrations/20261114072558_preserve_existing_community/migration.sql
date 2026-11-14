CREATE TABLE "community_imports" (
	"key" text PRIMARY KEY,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
