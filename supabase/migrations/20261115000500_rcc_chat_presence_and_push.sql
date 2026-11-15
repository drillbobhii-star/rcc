-- RCC chat presence and admin Web Push subscriptions.
-- Separate follow-up migration so projects that already applied 00400
-- receive these additions without having to edit/re-run an applied migration.

ALTER TABLE public.rcc_chat_conversations
  ADD COLUMN IF NOT EXISTS last_user_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS rcc_chat_conversations_last_seen_idx
  ON public.rcc_chat_conversations (last_user_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.rcc_chat_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rcc_chat_push_subscriptions_user_idx
  ON public.rcc_chat_push_subscriptions (user_id);

ALTER TABLE public.rcc_chat_push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rcc_chat_push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.rcc_chat_push_subscriptions TO service_role;
