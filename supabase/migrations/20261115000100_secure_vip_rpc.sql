-- RCC VIP hardening
-- Run once in Supabase SQL Editor (or apply as a migration).
-- The browser can call only rcc_is_my_vip(); it cannot SELECT membership rows.

begin;

-- Keep RLS enabled as defense in depth. Remove table-level read access from
-- browser roles; service_role retains its privileged backend access.
alter table public.rcc_vip_memberships enable row level security;
revoke all privileges on table public.rcc_vip_memberships from anon, authenticated;
grant all privileges on table public.rcc_vip_memberships to service_role;

-- Fast point lookup by the authenticated user's UUID. A non-unique index is
-- safe to apply even if legacy duplicate rows exist; EXISTS handles duplicates.
create index if not exists rcc_vip_memberships_user_id_idx
  on public.rcc_vip_memberships (user_id);

-- The function derives identity only from the verified JWT (auth.uid()).
-- It accepts no user_id parameter, so callers cannot check another account.
create or replace function public.rcc_is_my_vip()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select coalesce(
    auth.uid() is not null
    and exists (
      select 1
      from public.rcc_vip_memberships as membership
      where membership.user_id = auth.uid()
        and membership.is_vip is true
    ),
    false
  );
$$;

-- Only signed-in users can invoke the scalar boolean check.
revoke all on function public.rcc_is_my_vip() from public;
revoke all on function public.rcc_is_my_vip() from anon;
grant execute on function public.rcc_is_my_vip() to authenticated;

-- Maintain updated_at on every UPDATE, regardless of which backend performs it.
create or replace function public.rcc_set_vip_membership_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_rcc_vip_memberships_updated_at
  on public.rcc_vip_memberships;

revoke all on function public.rcc_set_vip_membership_updated_at() from public, anon, authenticated;\n\ncreate trigger trg_rcc_vip_memberships_updated_at
before update on public.rcc_vip_memberships
for each row
execute function public.rcc_set_vip_membership_updated_at();

commit;

-- Optional verification:
-- select has_table_privilege('authenticated', 'public.rcc_vip_memberships', 'SELECT') as authenticated_can_select;
-- Expected: false
-- select has_function_privilege('authenticated', 'public.rcc_is_my_vip()', 'EXECUTE') as authenticated_can_check_vip;
-- Expected: true
