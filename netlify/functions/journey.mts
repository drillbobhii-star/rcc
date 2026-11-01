import type { Config, Context } from '@netlify/functions';
import { getDatabase } from '@netlify/database';

export function sanitizeState(value: unknown) {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const text = (key: string, max = 100) => typeof input[key] === 'string' ? (input[key] as string).slice(0, max) : '';
  return {
    section: ['all', 'games', 'web'].includes(text('section')) ? text('section') : 'all',
    view: ['trending', 'updates'].includes(text('view')) ? text('view') : '',
    query: text('query', 200),
    scroll: typeof input.scroll === 'number' && Number.isFinite(input.scroll) ? Math.max(0, Math.min(100000, Math.round(input.scroll))) : 0,
    limit: typeof input.limit === 'number' && Number.isFinite(input.limit) ? Math.max(36, Math.min(1000, Math.round(input.limit))) : 36,
    device: ['all', 'pc', 'mobile', 'unknown'].includes(text('device')) ? text('device') : 'all',
    platform: text('platform') || 'all', executor: text('executor') || 'all', type: text('type') || 'all',
    tag: text('tag'), environment: text('environment') || 'all', verification: text('verification') || 'all',
    game: text('game'), origin: text('origin') || 'all',
    sort: ['original', 'newest', 'az', 'za'].includes(text('sort')) ? text('sort') : 'newest'
  };
}

export default async (request: Request, context: Context) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!['GET', 'POST'].includes(request.method)) return new Response(null, { status:405, headers:{...headers, Allow:'GET, POST'} });
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) return new Response(null, {status:403, headers});
  const cookie = context.cookies.get('rcc_journey');
  const id = cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cookie) ? cookie : crypto.randomUUID();
  context.cookies.set({name:'rcc_journey', value:id, path:'/', httpOnly:true, secure:new URL(request.url).protocol === 'https:', sameSite:'Lax', maxAge:31536000});
  try {
    const db = getDatabase();
    if (request.method === 'GET') {
      const rows = await db.sql`SELECT completed, state FROM browser_journeys WHERE id = ${id}`;
      return Response.json(rows[0] || {completed:false, state:null}, {headers});
    }
    if (Number(request.headers.get('content-length') || 0) > 8192) return new Response(null, {status:413, headers});
    const raw = await request.text();
    if (raw.length > 8192) return new Response(null, {status:413, headers});
    let payload;
    try { payload = JSON.parse(raw); } catch { return new Response(null, {status:400, headers}); }
    if (!payload || typeof payload !== 'object') return new Response(null, {status:400, headers});
    const completed = payload.completed === true;
    const state = JSON.stringify(sanitizeState(payload.state));
    await db.sql`INSERT INTO browser_journeys (id, completed, state) VALUES (${id}, ${completed}, ${state}::jsonb)
      ON CONFLICT (id) DO UPDATE SET completed = browser_journeys.completed OR EXCLUDED.completed, state = EXCLUDED.state, updated_at = now()`;
    return Response.json({saved:true}, {headers});
  } catch {
    return Response.json({error:'No se pudo guardar o recuperar tu visita.'}, {status:503, headers});
  }
};
export const config: Config = { path:'/api/journey' };
