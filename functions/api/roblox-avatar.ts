function reply(data: object, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return reply({ error: 'Origen no permitido.' }, 403);
  }
  if (Number(request.headers.get('content-length')) > 256) {
    return reply({ error: 'Nombre de usuario no válido.' }, 400);
  }

  try {
    const payload = await request.json() as { query?: unknown; username?: unknown };
    const query = String(payload.query ?? payload.username ?? '').trim().replace(/^@/, '');
    if (!query || query.length > 24) return reply({ error: 'Escribe un usuario o ID de Roblox válido.' }, 400);
    let userId: number, name: string;
    if (/^\d{1,20}$/.test(query)) {
      userId = Number(query);
      if (!Number.isSafeInteger(userId) || userId <= 0) return reply({ error: 'El ID de Roblox no es válido.' }, 400);
      const response = await fetch('https://users.roblox.com/v1/users/' + userId, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return reply({ error: 'No existe ese ID de Roblox.' }, 404);
      const user = await response.json() as { id: number; name: string };
      userId = user.id; name = user.name;
    } else {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(query)) return reply({ error: 'El nombre debe tener entre 3 y 20 caracteres.' }, 400);
      const lookup = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ usernames: [query], excludeBannedUsers: false }),
        signal: AbortSignal.timeout(8000),
      });
      if (!lookup.ok) return reply({ error: 'Roblox no pudo verificar ese usuario.' }, 502);
      const lookupData = await lookup.json() as { data?: Array<{ id?: number; name?: string }> };
      const user = lookupData.data?.[0];
      if (!Number.isSafeInteger(user?.id) || !user?.id || !user.name) return reply({ error: 'No existe una cuenta con ese nombre de Roblox.' }, 404);
      userId = user.id; name = user.name;
    }

    const thumbnailUrl = new URL('https://thumbnails.roblox.com/v1/users/avatar-headshot');
    thumbnailUrl.searchParams.set('userIds', String(userId));
    thumbnailUrl.searchParams.set('size', '150x150');
    thumbnailUrl.searchParams.set('format', 'Png');
    thumbnailUrl.searchParams.set('isCircular', 'false');
    const thumbnail = await fetch(thumbnailUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!thumbnail.ok) return reply({ error: 'No se pudo obtener la foto de Roblox.' }, 502);
    const thumbnailData = await thumbnail.json() as { data?: Array<{ state?: string; imageUrl?: string | null }> };
    const image = thumbnailData.data?.[0];
    if (!image?.imageUrl || !image.imageUrl.startsWith('https://')) return reply({ error: 'Roblox aún no tiene una foto disponible para esa cuenta.' }, 404);
    return reply({ id: userId, name, avatarUrl: image.imageUrl });
  } catch {
    return reply({ error: 'No se pudo consultar Roblox en este momento.' }, 503);
  }
}
