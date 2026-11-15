create table if not exists public.rcc_vip_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_vip boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.rcc_vip_memberships enable row level security;

-- La tabla solo se consulta y modifica desde la función de servidor con service_role.
revoke all on public.rcc_vip_memberships from anon, authenticated;
grant all on public.rcc_vip_memberships to service_role;

notify pgrst, 'reload schema';
