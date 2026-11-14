# Configuración de perfiles sociales RCC (Supabase)

La columna `profiles.banner_url` ya fue creada por el propietario. La implementación también guarda `roblox_username` para que el perfil público pueda mostrar la cuenta vinculada sin revelar el correo.

Ejecuta una vez en Supabase SQL Editor:

```sql
alter table public.profiles
  add column if not exists roblox_username text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "RCC public profile banners are readable"
on storage.objects for select
to public
using (bucket_id = 'profile-media');

create policy "RCC members upload their own banners"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'banners'
);

create policy "RCC members delete their own banners"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] = 'banners'
);
```

Si ya existen políticas con esos nombres, no ejecutes las sentencias `create policy` duplicadas; revisa y reutiliza las políticas existentes. El bucket debe ser público para que los banners puedan verse en los perfiles sin iniciar sesión. Las cargas siguen limitadas a la carpeta del usuario autenticado.

## Importante sobre el bloqueo del catálogo

El catálogo RCC actual se descarga desde archivos JSON públicos. El bloqueo del 80 % implementado en la interfaz es una barrera de experiencia de usuario, no una protección criptográfica: alguien con conocimientos técnicos aún puede recuperar el JSON. Para ocultar realmente el código, hay que mover el contenido de los scripts restringidos a una API/almacenamiento privado y validar la sesión del lado servidor antes de devolverlo.
