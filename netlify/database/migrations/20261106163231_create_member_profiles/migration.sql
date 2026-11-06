CREATE TABLE "member_profiles" (
	"user_id" text PRIMARY KEY,
	"avatar_url" text DEFAULT '' NOT NULL,
	"display_name" text NOT NULL,
	"text_color" text DEFAULT '#dce6f5' NOT NULL,
	CONSTRAINT "member_profiles_display_name_check" CHECK (char_length("display_name") between 1 and 80),
	CONSTRAINT "member_profiles_text_color_check" CHECK ("text_color" ~ '^#[a-fA-F0-9]{6}$')
);
