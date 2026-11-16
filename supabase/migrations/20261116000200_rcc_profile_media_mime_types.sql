-- RCC profile media: accept image MIME types, including animated GIFs.
-- Preserve existing bucket visibility and any existing storage policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 12582912, array['image/*'])
on conflict (id) do update
set allowed_mime_types = array['image/*'],
    file_size_limit = greatest(coalesce(storage.buckets.file_size_limit, 0), 12582912);

-- Users can only upload/manage files inside their own UUID folder.
drop policy if exists "RCC users upload own profile media" on storage.objects;
create policy "RCC users upload own profile media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "RCC users update own profile media" on storage.objects;
create policy "RCC users update own profile media"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "RCC users delete own profile media" on storage.objects;
create policy "RCC users delete own profile media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
