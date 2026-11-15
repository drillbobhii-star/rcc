-- RCC private support chat
-- All reads/writes flow through the authenticated Pages Function. The client
-- never receives service-role credentials or direct table/storage privileges.

alter table public.profiles
  add column if not exists is_banned boolean not null default false;

-- Users must not be able to lift their own restriction by calling
-- Supabase UPDATE directly. Only server-side service_role changes this flag.
create or replace function public.rcc_protect_account_ban_flag()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, auth
as $rcc_ban_guard$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      if new.is_banned is true then
        raise exception 'is_banned can only be changed by the RCC support backend'
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.is_banned is distinct from old.is_banned then
        raise exception 'is_banned can only be changed by the RCC support backend'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$rcc_ban_guard$;

revoke all on function public.rcc_protect_account_ban_flag() from public, anon, authenticated;

drop trigger if exists trg_rcc_protect_account_ban_flag on public.profiles;
create trigger trg_rcc_protect_account_ban_flag
before insert or update on public.profiles
for each row
execute function public.rcc_protect_account_ban_flag();

create table if not exists public.rcc_chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  admin_typing_until timestamptz,
  user_typing_until timestamptz
);

create index if not exists rcc_chat_conversations_updated_idx
  on public.rcc_chat_conversations (updated_at desc);

create table if not exists public.rcc_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.rcc_chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('admin','user')),
  content text not null default '' check (char_length(content) <= 5000),
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint rcc_chat_message_has_content check (
    char_length(trim(content)) > 0 or file_path is not null
  )
);

create index if not exists rcc_chat_messages_conversation_created_idx
  on public.rcc_chat_messages (conversation_id, created_at asc);

create index if not exists rcc_chat_messages_unread_idx
  on public.rcc_chat_messages (conversation_id, sender_role, read_at);

-- Admin-only notes intentionally do not use profiles.bio (which may be public).
create table if not exists public.rcc_admin_private_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 10000),
  updated_at timestamptz not null default now()
);

alter table public.rcc_chat_conversations enable row level security;
alter table public.rcc_chat_messages enable row level security;
alter table public.rcc_admin_private_notes enable row level security;

revoke all on public.rcc_chat_conversations from anon, authenticated;
revoke all on public.rcc_chat_messages from anon, authenticated;
revoke all on public.rcc_admin_private_notes from anon, authenticated;
grant all on public.rcc_chat_conversations to service_role;
grant all on public.rcc_chat_messages to service_role;
grant all on public.rcc_admin_private_notes to service_role;

-- Private bucket. Uploads/downloads are proxied/signed by functions/api/chat.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-files',
  'chat-files',
  false,
  10485760,
  array[
    'image/png','image/jpeg','image/webp','image/gif',
    'application/pdf','text/plain','text/csv',
    'application/zip','application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- A restrictive policy prevents any broader permissive Storage policy in the
-- project from accidentally exposing this private chat bucket to browser roles.
drop policy if exists rcc_chat_files_server_only on storage.objects;
create policy rcc_chat_files_server_only
  on storage.objects
  as restrictive
  for all
  to anon, authenticated
  using (bucket_id <> 'chat-files')
  with check (bucket_id <> 'chat-files');

-- No anon/authenticated bucket policies are created. Backend service-role
-- operations issue short-lived signed URLs only to the conversation parties.
