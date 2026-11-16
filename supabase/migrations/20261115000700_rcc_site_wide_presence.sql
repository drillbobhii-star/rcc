-- RCC site-wide authenticated presence, independent of the private chat window.
-- A user is considered online while the browser refreshes last_seen_at every 25 seconds.
-- The API treats entries older than 90 seconds as offline.

CREATE TABLE IF NOT EXISTS public.rcc_site_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rcc_site_presence_last_seen_idx
  ON public.rcc_site_presence (last_seen_at DESC);

ALTER TABLE public.rcc_site_presence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rcc_site_presence FROM anon, authenticated;
GRANT ALL ON public.rcc_site_presence TO service_role;
