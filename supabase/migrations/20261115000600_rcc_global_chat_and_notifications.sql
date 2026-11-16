-- RCC global chat controls and audience-aware Web Push subscriptions.
ALTER TABLE public.rcc_chat_push_subscriptions ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'admin';
ALTER TABLE public.rcc_chat_push_subscriptions DROP CONSTRAINT IF EXISTS rcc_chat_push_subscriptions_audience_check;
ALTER TABLE public.rcc_chat_push_subscriptions ADD CONSTRAINT rcc_chat_push_subscriptions_audience_check CHECK (audience IN ('admin','user'));
CREATE INDEX IF NOT EXISTS rcc_chat_push_subscriptions_audience_user_idx ON public.rcc_chat_push_subscriptions (audience,user_id);
CREATE TABLE IF NOT EXISTS public.rcc_chat_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton=true),
  chat_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.rcc_chat_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rcc_chat_settings FROM anon,authenticated;
GRANT ALL ON public.rcc_chat_settings TO service_role;
INSERT INTO public.rcc_chat_settings(singleton,chat_enabled) VALUES(true,true) ON CONFLICT(singleton) DO NOTHING;
