-- RCC Control Center profile flags
-- These columns are controlled only through the authenticated admin API.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_creator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_banner boolean NOT NULL DEFAULT false;
