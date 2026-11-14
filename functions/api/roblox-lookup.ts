function reply(data: object, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'public, max-age=60' } }); }
export async function onRequestPost({ request }: { request: Request }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({ error: 'Origen no permitido.' }, 403);
  try {
    const body = await request.json() as { query?: unknown };
    const query = typeof body.query === 'string' ? body.query.trim().replace(/^@/, '') : '';
    if (!query || query.length > 32) return reply({ error: 'Escribe un usuario o ID de Roblox válido.' }, 400);
    let userId: number, name: string;
    if (/^[0-9]{1,20}$/.test(query)) {
      userId = Number(query);
      if (!Number.isSafeInteger(userId) || userId <= 0) return reply({ error: 'El ID no es válido.' }, 400);
      const response = await fetch('https://users.roblox.com/v1/users/' + userId, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return reply({ error: 'No existe ese ID de Roblox.' }, 404);
      const user = await response.json() as { id: number; name: string };
      userId = user.id; name = user.name;
    } else {
      if (!/^[A-Za-z0-9_]{3,20}$/.test(query)) return reply({ error: 'El nombre debe tener entre 3 y 20 caracteres.' }, 400);
      const response = await fetch('https://users.roblox.com/v1/usernames/users', { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify({usernames:[query],excludeBannedUsers:false}), signal:AbortSignal.timeout(8000) });
      if (!response.ok) return reply({ error: 'Roblox no pudo verificar ese usuario.' }, 502);
      const data = await response.json() as { data?: Array<{id:number;name:string}> };
      const user = data.data?.[0]; if (!user?.id) return reply({ error: 'No existe ese usuario de Roblox.' }, 404);
      userId = user.id; name = user.name;
    }
    const thumbUrl = new URL('https://thumbnails.roblox.com/v1/users/avatar-headshot');
    thumbUrl.searchParams.set('userIds',String(userId)); thumbUrl.searchParams.set('size','150x150'); thumbUrl.searchParams.set('format','Png'); thumbUrl.searchParams.set('isCircular','false');
    const thumb = await fetch(thumbUrl,{signal:AbortSignal.timeout(8000)}); if(!thumb.ok) return reply({error:'No se pudo obtener el avatar.'},502);
    const thumbData = await thumb.json() as {data?:Array<{imageUrl?:string}>}; const avatarUrl=thumbData.data?.[0]?.imageUrl;
    if(!avatarUrl || !avatarUrl.startsWith('https://')) return reply({error:'Roblox aún no tiene un avatar disponible.'},404);
    return reply({id:userId,name,avatarUrl});
  } catch { return reply({error:'No se pudo consultar Roblox en este momento.'},503); }
}
