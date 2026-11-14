-- Allow comment owners to edit/delete their own comments and the verified founder
-- account to moderate any comment. Never trust a client-supplied is_creator flag.
--
-- Keep the existing SELECT and INSERT policies unchanged.
grant update (text) on table public.comments to authenticated;
grant delete on table public.comments to authenticated;

drop policy if exists comments_update_owner_or_founder on public.comments;
create policy comments_update_owner_or_founder
  on public.comments
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

drop policy if exists comments_delete_owner_or_founder on public.comments;
create policy comments_delete_owner_or_founder
  on public.comments
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'drillbobhii@gmail.com'
  );
