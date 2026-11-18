-- Public community directory: Roblox identity is exposed only when the member opts in.
-- SECURITY INVOKER keeps the underlying profiles RLS policies in force.
create or replace view public.rcc_public_profiles
with (security_invoker = true)
as
select
  user_id,
  display_name,
  avatar_url,
  bio,
  case when show_roblox then roblox_username else null end as roblox_username,
  case when show_roblox then roblox_id else null end as roblox_id,
  show_roblox,
  banner_url,
  is_creator
from public.profiles;

grant select on public.rcc_public_profiles to anon, authenticated;
notify pgrst, 'reload schema';
