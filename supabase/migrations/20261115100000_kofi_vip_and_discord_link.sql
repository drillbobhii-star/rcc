-- Ko-fi grants Supporter access to any matching RCC account, independently of creator/admin status.
alter table public.profiles
  add column if not exists is_supporter boolean not null default false,
  add column if not exists discord_id text;

-- A Discord account can only be linked to one RCC profile.
create unique index if not exists profiles_discord_id_unique
  on public.profiles (discord_id)
  where discord_id is not null and discord_id <> '';

-- Store processed Ko-fi event IDs so retries cannot create duplicate grants.
create table if not exists public.rcc_kofi_events (
  message_id text primary key,
  kofi_transaction_id text unique,
  user_id uuid references auth.users(id) on delete set null,
  buyer_email text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  processed_at timestamptz not null default now()
);

alter table public.rcc_kofi_events enable row level security;
revoke all on public.rcc_kofi_events from anon, authenticated;
grant all on public.rcc_kofi_events to service_role;

notify pgrst, 'reload schema';
