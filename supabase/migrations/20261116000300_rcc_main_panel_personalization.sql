-- RCC main panel personal backgrounds and optional logo overlay.
alter table public.profiles
  add column if not exists main_background_url text,
  add column if not exists main_background_fit text not null default 'cover',
  add column if not exists main_background_position text not null default 'center',
  add column if not exists main_background_opacity numeric not null default 0.42,
  add column if not exists main_logo_url text,
  add column if not exists main_logo_enabled boolean not null default false,
  add column if not exists main_logo_size integer not null default 220,
  add column if not exists main_logo_opacity numeric not null default 0.28,
  add column if not exists main_logo_position text not null default 'center';

alter table public.profiles drop constraint if exists profiles_main_background_fit_check;
alter table public.profiles add constraint profiles_main_background_fit_check
  check (main_background_fit in ('cover','contain','auto'));
alter table public.profiles drop constraint if exists profiles_main_background_position_check;
alter table public.profiles add constraint profiles_main_background_position_check
  check (main_background_position in ('center','top','bottom','left','right'));
alter table public.profiles drop constraint if exists profiles_main_background_opacity_check;
alter table public.profiles add constraint profiles_main_background_opacity_check
  check (main_background_opacity between 0.1 and 1);
alter table public.profiles drop constraint if exists profiles_main_logo_size_check;
alter table public.profiles add constraint profiles_main_logo_size_check
  check (main_logo_size between 60 and 520);
alter table public.profiles drop constraint if exists profiles_main_logo_opacity_check;
alter table public.profiles add constraint profiles_main_logo_opacity_check
  check (main_logo_opacity between 0.05 and 1);
alter table public.profiles drop constraint if exists profiles_main_logo_position_check;
alter table public.profiles add constraint profiles_main_logo_position_check
  check (main_logo_position in ('center','top-left','top-right','bottom-left','bottom-right'));
