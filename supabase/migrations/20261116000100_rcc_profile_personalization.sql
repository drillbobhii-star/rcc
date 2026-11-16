-- RCC profile personalization: custom backgrounds and VIP banner layout.
alter table public.profiles
  add column if not exists profile_background_url text not null default '',
  add column if not exists profile_background_type text not null default 'image',
  add column if not exists banner_height integer not null default 180,
  add column if not exists banner_position text not null default 'center';

alter table public.profiles
  drop constraint if exists profiles_banner_height_check,
  add constraint profiles_banner_height_check check (banner_height between 180 and 300),
  drop constraint if exists profiles_banner_position_check,
  add constraint profiles_banner_position_check check (banner_position in ('center','top','bottom')),
  drop constraint if exists profiles_profile_background_type_check,
  add constraint profiles_profile_background_type_check check (profile_background_type in ('image','gif'));

notify pgrst, 'reload schema';

-- Enforce the VIP-only expanded banner layout even if a client bypasses the UI.
create or replace function public.rcc_enforce_vip_profile_banner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.banner_height > 180 or new.banner_position <> 'center') and not exists (
    select 1 from public.rcc_vip_memberships m
    where m.user_id = new.user_id and m.is_vip = true
  ) then
    raise exception 'La personalización ampliada del banner es exclusiva RCC VIP.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists rcc_profiles_vip_banner_guard on public.profiles;
create trigger rcc_profiles_vip_banner_guard
before insert or update of banner_height, banner_position on public.profiles
for each row execute function public.rcc_enforce_vip_profile_banner();

revoke all on function public.rcc_enforce_vip_profile_banner() from public, anon, authenticated;
