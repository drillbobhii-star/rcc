-- SQL opcional para Supabase. La aplicación desplegada usa Netlify Database.
BEGIN;
CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url text NOT NULL DEFAULT '' CHECK (avatar_url = '' OR avatar_url ~ '^https://'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  text_color text NOT NULL DEFAULT '#dce6f5' CHECK (text_color ~ '^#[a-fA-F0-9]{6}$')
);
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id text NOT NULL CHECK (char_length(script_id) > 0),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  text text NOT NULL CHECK (char_length(trim(text)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_script_date_idx ON public.comments(script_id, created_at DESC);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comments, public.profiles FROM anon, authenticated;
GRANT SELECT ON public.comments, public.profiles TO anon, authenticated;
GRANT INSERT ON public.comments TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
CREATE POLICY comments_read ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY comments_insert ON public.comments FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND user_email = (SELECT auth.jwt()->>'email'));
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
COMMIT;
