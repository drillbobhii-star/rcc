-- RCC public social profiles, follows, creator support availability and profile code gallery.
alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text not null default '',
  add column if not exists cover_url text,
  add column if not exists public_profile boolean not null default true;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null and length(trim(username)) > 0;

create table if not exists public.rcc_profile_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint rcc_profile_follow_no_self check (follower_id <> followed_id)
);
create index if not exists rcc_profile_follows_followed_idx
  on public.rcc_profile_follows (followed_id, created_at desc);

create table if not exists public.rcc_profile_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  game_name text not null default '' check (char_length(game_name) <= 100),
  description text not null default '' check (char_length(description) <= 500),
  code_text text not null check (char_length(code_text) between 1 and 100000),
  created_at timestamptz not null default now()
);
create index if not exists rcc_profile_codes_user_created_idx
  on public.rcc_profile_codes (user_id, created_at desc);

create table if not exists public.rcc_social_settings (
  id boolean primary key default true check (id = true),
  creator_messages_enabled boolean not null default true,
  profiles_enabled boolean not null default true,
  follows_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.rcc_social_settings (id) values (true)
on conflict (id) do nothing;

alter table public.rcc_profile_follows enable row level security;
alter table public.rcc_profile_codes enable row level security;
alter table public.rcc_social_settings enable row level security;
revoke all on public.rcc_profile_follows from anon, authenticated;
revoke all on public.rcc_profile_codes from anon, authenticated;
revoke all on public.rcc_social_settings from anon, authenticated;
grant all on public.rcc_profile_follows to service_role;
grant all on public.rcc_profile_codes to service_role;
grant all on public.rcc_social_settings to service_role;

-- All writes are performed by the authenticated Pages Function after validating
-- the caller. Never expose auth.users email addresses in public profile payloads.
