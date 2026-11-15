CREATE TABLE "discord_pending_actions" (
	"id" uuid PRIMARY KEY,
	"user_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
