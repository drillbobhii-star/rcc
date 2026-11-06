import { getDatabase } from '@netlify/database';
import catalogIds from './lib/catalog-ids.json' with { type: 'json' };
const AUTH_URL = 'https://cbkrpyfkteomcukdisdw.supabase.co/auth/v1/user';
export default async (request: Request) => {
  const url = new URL(request.url);
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!['GET','POST','PUT'].includes(request.method)) return reply({error:'Método no permitido.'},405);
  const profile = url.searchParams.get('action') === 'profile';
  const script = url.searchParams.get('script') || '';
  if (!profile && !catalogIds.includes(script)) return reply({error:'Script no encontrado.'},404);
  try {
    let user: {id:string,email?:string} | null = null;
    if (request.method !== 'GET' || profile) {
      if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) return reply({error:'Origen no permitido.'},403);
      const token = request.headers.get('authorization');
      const key = request.headers.get('x-supabase-key');
      if (!token?.startsWith('Bearer ') || !key) return reply({error:'Inicia sesión para continuar.'},401);
      const result = await fetch(AUTH_URL,{headers:{Authorization:token,apikey:key},signal:AbortSignal.timeout(10000)});
      if (!result.ok) return reply({error:'Tu sesión ha caducado. Inicia sesión de nuevo.'},401);
      user = await result.json();
      if (!user?.id) return reply({error:'Sesión inválida.'},401);
    }
    const db = getDatabase();
    if (profile && request.method === 'GET') {
      const rows = await db.sql`SELECT user_id, avatar_url, display_name, text_color FROM member_profiles WHERE user_id = ${user!.id}`;
      return reply({profile:rows[0] || null});
    }
    if (!profile && request.method === 'GET') {
      const rows = await db.sql`SELECT c.id, c.body AS text, c.created_at, p.avatar_url, COALESCE(NULLIF(p.display_name,''),'Miembro RCC') AS display_name, COALESCE(p.text_color,'#dce6f5') AS text_color FROM comments c LEFT JOIN member_profiles p ON p.user_id=c.user_id WHERE c.script_id=${script} ORDER BY c.created_at DESC,c.id DESC LIMIT 100`;
      return reply({comments:rows});
    }
    if (Number(request.headers.get('content-length')) > 12000) return reply({error:'Contenido demasiado largo.'},413);
    const body = await request.json();
    if (profile && request.method === 'PUT') {
      const name = String(body.display_name || '').trim();
      const avatar = String(body.avatar_url || '').trim();
      const color = String(body.text_color || '');
      if (!name || name.length>80 || !/^#[a-f0-9]{6}$/i.test(color) || avatar.length>2000 || (avatar && new URL(avatar).protocol !== 'https:')) return reply({error:'Revisa el nombre, el color y la URL HTTPS de la foto.'},400);
      await db.sql`INSERT INTO member_profiles(user_id,avatar_url,display_name,text_color) VALUES(${user!.id},${avatar},${name},${color}) ON CONFLICT(user_id) DO UPDATE SET avatar_url=excluded.avatar_url,display_name=excluded.display_name,text_color=excluded.text_color`;
      return reply({ok:true});
    }
    if (!profile && request.method === 'POST') {
      const text = String(body.text || '').trim();
      if (!text || text.length>2000) return reply({error:'Escribe un comentario de 1 a 2000 caracteres.'},400);
      await db.sql`INSERT INTO comments(script_id,user_id,author,body) VALUES(${script},${user!.id},${user!.email || 'Miembro RCC'},${text})`;
      return reply({ok:true},201);
    }
    return reply({error:'Método no permitido.'},405);
  } catch { return reply({error:'No se pudo completar la operación. Comprueba los datos y vuelve a intentarlo.'},500); }
};
