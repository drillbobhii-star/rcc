-- Ejecutar manualmente en el SQL Editor del proyecto Supabase.
begin;
create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id text not null check (length(script_id) > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, script_id)
);
create table if not exists public.votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id text not null check (length(script_id) > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, script_id)
);
alter table public.favorites enable row level security;
alter table public.votes enable row level security;
revoke all on public.favorites, public.votes from anon;
revoke all on public.favorites, public.votes from authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert on public.votes to authenticated;
drop policy if exists favorites_read_own on public.favorites;
create policy favorites_read_own on public.favorites for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists votes_read_own on public.votes;
create policy votes_read_own on public.votes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists votes_insert_own on public.votes;
create policy votes_insert_own on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);
commit;
