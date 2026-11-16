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
