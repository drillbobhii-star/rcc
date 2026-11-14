-- Restore social-profile fields used by the Supabase-only community client.
-- Apply this migration to the Supabase project before deploying the matching Pages build.

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists roblox_id text not null default '',
  add column if not exists show_roblox boolean not null default false,
  add column if not exists name_effect text not null default 'none',
  add column if not exists banner_effect text not null default 'none',
  add column if not exists is_creator boolean not null default false;

-- Ensure deleting a parent comment also deletes its complete reply subtree.
do $$
declare
  fk record;
begin
  for fk in
    select c.conname
    from pg_constraint c
    join unnest(c.conkey) as key(attnum) on true
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = key.attnum
    where c.contype = 'f'
      and c.conrelid = 'public.comments'::regclass
      and a.attname = 'parent_id'
  loop
    execute format('alter table public.comments drop constraint %I', fk.conname);
  end loop;

  alter table public.comments
    add constraint comments_parent_id_fkey
    foreign key (parent_id)
    references public.comments(id)
    on delete cascade;
end $$;
