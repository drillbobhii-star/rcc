-- Restrict comment editing/deletion to the comment owner or the verified RCC founder account.
-- Keep existing permissive owner policies; these restrictive policies are ANDed with them,
-- preventing any broader permissive policy from granting cross-user moderation.
alter table public.comments enable row level security;

drop policy if exists comments_owner_or_founder_update_guard on public.comments;
create policy comments_owner_or_founder_update_guard
  on public.comments
  as restrictive
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'drillbobhii@gmail.com'
  )
  with check (
    auth.uid() = user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'drillbobhii@gmail.com'
  );

drop policy if exists comments_owner_or_founder_delete_guard on public.comments;
create policy comments_owner_or_founder_delete_guard
  on public.comments
  as restrictive
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'drillbobhii@gmail.com'
  );

-- No INSERT or SELECT policy is changed here. Existing comment creation and reading
-- behavior remains governed by the project's current policies.
