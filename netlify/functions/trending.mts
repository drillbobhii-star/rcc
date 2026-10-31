import type { Config } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import { drizzle } from 'drizzle-orm/netlify-db';
import { count, desc, gte, sql } from 'drizzle-orm';
import { scriptCopies } from '../../db/schema.js';
import catalogIds from './lib/catalog-ids.json' with { type: 'json' };

export default async (request: Request) => {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  const respond = (data: unknown, status = 200) => Response.json(data, { status, headers });
  if (!['GET', 'POST'].includes(request.method))
    return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  const url = new URL(request.url);
  if (request.method === 'POST' && request.headers.get('origin') !== url.origin)
    return respond({ error: 'Origen no permitido.' }, 403);
  try {
    const db = drizzle({ schema: { scriptCopies } });
    if (request.method === 'GET') {
      const copies = count();
      const items = await db.select({ id: scriptCopies.scriptId, copies }).from(scriptCopies)
        .where(gte(scriptCopies.createdAt, sql`now() - interval '7 days'`))
        .groupBy(scriptCopies.scriptId).orderBy(desc(copies), scriptCopies.scriptId).limit(12);
      return respond({ items, days: 7 });
    }
    const scriptId = url.searchParams.get('script') || '';
    if (!catalogIds.includes(scriptId)) return respond({ error: 'Código no encontrado.' }, 404);
    const cookie = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('rcc_copy_visitor='))?.slice(17);
    const visitorId = cookie && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(cookie) ? cookie : randomUUID();
    if (visitorId !== cookie) headers['Set-Cookie'] = `rcc_copy_visitor=${visitorId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`;
    // One recorded copy per browser, script and UTC day. Repeated clicks do not inflate rankings.
    await db.insert(scriptCopies).values({ scriptId, visitorId }).onConflictDoNothing();
    return respond({ ok: true });
  } catch {
    return respond({ error: 'No se pudieron cargar las tendencias. Inténtalo de nuevo.' }, 503);
  }
};
export const config: Config = { path: '/api/trending' };
