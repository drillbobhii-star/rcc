import type { Config, Context } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/netlify-db';
import { count } from 'drizzle-orm';
import { visitors } from '../../db/schema.js';

export default async (request: Request, context: Context) => {
  const headers = { 'Cache-Control': 'no-store' };
  if (!['GET', 'POST'].includes(request.method)) {
    return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, POST' } });
  }
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin) {
    return new Response(null, { status: 403, headers });
  }
  try {
    const db = drizzle({ schema: { visitors } });
    if (request.method === 'POST') {
      const cookie = context.cookies.get('rcc_visitor');
      const id = cookie && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cookie)
        ? cookie : crypto.randomUUID();
      await db.insert(visitors).values({ id }).onConflictDoNothing();
      context.cookies.set({ name: 'rcc_visitor', value: id, httpOnly: true,
        secure: new URL(request.url).protocol === 'https:', sameSite: 'Lax', path: '/', maxAge: 31536000 });
    }
    const [result] = await db.select({ total: count() }).from(visitors);
    return Response.json({ total: result.total }, { headers });
  } catch {
    return Response.json({ error: 'El contador no está disponible temporalmente.' }, { status: 503, headers });
  }
};
export const config: Config = { path: '/api/visitors' };
