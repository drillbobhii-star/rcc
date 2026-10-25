import type { Config } from '@netlify/functions';
import { getUser } from '@netlify/identity';
import { drizzle } from 'drizzle-orm/netlify-db';
import { and, eq, desc, count, sql } from 'drizzle-orm';
import { favorites, votes, comments } from '../../db/schema.js';
import catalogIds from './lib/catalog-ids.json' with { type: 'json' };

export default async (request: Request) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  const respond = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const url = new URL(request.url);
  if (!['GET', 'PUT', 'DELETE', 'POST'].includes(request.method))
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, PUT, DELETE, POST' } });
  if (request.method !== 'GET' && request.headers.get('origin') !== url.origin)
    return respond({ error: 'Origen no permitido.' }, 403);
  try {
    const user = await getUser();
    const db = drizzle({ schema: { favorites, votes, comments } });
    const action = url.searchParams.get('action');
    if (action === 'favorites' && request.method === 'GET') {
      if (!user) return respond({ error: 'Inicia sesión para ver tus guardados.' }, 401);
      return respond({ ids: (await db.select({ id: favorites.scriptId }).from(favorites)
        .where(eq(favorites.userId, user.id))).map(row => row.id) });
    }
    const scriptId = url.searchParams.get('script') || '';
    if (!catalogIds.includes(scriptId)) return respond({ error: 'Script no encontrado.' }, 404);
    if (action === 'thread' && request.method === 'GET') {
      const before = url.searchParams.get('before');
      if (before && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(before)) return respond({ error: 'Página inválida.' }, 400);
      const [total] = await db.select({ value: count() }).from(votes).where(eq(votes.scriptId, scriptId));
      const liked = user ? await db.select({ id: votes.scriptId }).from(votes)
        .where(and(eq(votes.scriptId, scriptId), eq(votes.userId, user.id))).limit(1) : [];
      const rows = await db.select({ id: comments.id, author: comments.author, body: comments.body,
        createdAt: comments.createdAt, userId: comments.userId }).from(comments)
        .where(and(eq(comments.scriptId, scriptId), before ? sql`(${comments.createdAt}, ${comments.id}) < (select created_at, id from comments where id = ${before}::uuid and script_id = ${scriptId})` : undefined))
        .orderBy(desc(comments.createdAt), desc(comments.id)).limit(31);
      const page = rows.slice(0, 30);
      return respond({ likes: total.value, liked: liked.length > 0,
        comments: page.map(({ userId, ...row }) => ({ ...row, mine: userId === user?.id })),
        next: rows.length > 30 ? page.at(-1)?.id : null });
    }
    if (!user || !user.confirmedAt) return respond({ error: 'Inicia sesión y confirma tu correo para participar.' }, 401);
    if (action === 'favorite' || action === 'like') {
      if (!['PUT', 'DELETE'].includes(request.method)) return respond({ error: 'Método no permitido.' }, 405);
      const table = action === 'favorite' ? favorites : votes;
      if (request.method === 'PUT') await db.insert(table).values({ userId: user.id, scriptId }).onConflictDoNothing();
      else await db.delete(table).where(and(eq(table.userId, user.id), eq(table.scriptId, scriptId)));
      return respond({ ok: true });
    }
    if (action === 'comment' && request.method === 'POST') {
      if (Number(request.headers.get('content-length')) > 12000) return respond({ error: 'Comentario demasiado largo.' }, 413);
      const raw = await request.text();
      if (raw.length > 12000) return respond({ error: 'Comentario demasiado largo.' }, 413);
      let payload;
      try { payload = JSON.parse(raw); } catch { return respond({ error: 'Comentario inválido.' }, 400); }
      const body = typeof payload?.body === 'string' ? payload.body.trim() : '';
      if (!body || body.length > 2000) return respond({ error: 'Escribe entre 1 y 2000 caracteres.' }, 400);
      // El autor se deriva de la sesión; el correo completo solo se muestra a su propietario.
      const author = (user.name || user.email?.split('@')[0] || 'Miembro RCC').slice(0, 80);
      const [comment] = await db.insert(comments).values({ userId: user.id, scriptId, author, body })
        .returning({ id: comments.id, author: comments.author, body: comments.body, createdAt: comments.createdAt });
      return respond({ comment: { ...comment, mine: true } }, 201);
    }
    if (action === 'comment' && request.method === 'DELETE') {
      const id = url.searchParams.get('id') || '';
      if (!/^[a-f0-9-]{36}$/i.test(id)) return respond({ error: 'Comentario inválido.' }, 400);
      await db.delete(comments).where(and(eq(comments.id, id), eq(comments.scriptId, scriptId), eq(comments.userId, user.id)));
      return respond({ ok: true });
    }
    return respond({ error: 'Operación no permitida.' }, 405);
  } catch {
    return respond({ error: 'La comunidad no está disponible temporalmente. Vuelve a intentarlo.' }, 503);
  }
};
export const config: Config = { path: '/api/community' };
