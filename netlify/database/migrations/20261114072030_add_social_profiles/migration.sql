ALTER TABLE "comments" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "banner_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "roblox_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "roblox_username" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "show_roblox" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "name_effect" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "banner_effect" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD COLUMN "is_creator" boolean DEFAULT false NOT NULL;