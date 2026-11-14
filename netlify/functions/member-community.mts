import type { Config } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
import { getUser } from '@netlify/identity';
import { importCommunity } from './lib/import-community.mts';
import catalogIds from './lib/catalog-ids.json' with { type: 'json' };
const creatorEmail = 'drillbobhii@gmail.com';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const effects = ['none','shimmer','float','aurora'];
export async function lookupRoblox(input: string) {
  const query = input.trim().replace(/^@/,'');
  if (!/^(\d{1,18}|[A-Za-z0-9_]{3,20})$/.test(query)) throw Error('Escribe un nombre o ID de Roblox válido.');
  const numeric = /^\d+$/.test(query);
  const response = await fetch(numeric ? `https://users.roblox.com/v1/users/${query}` : 'https://users.roblox.com/v1/usernames/users', {
    method: numeric ? 'GET' : 'POST', headers:{'Content-Type':'application/json'},
    ...(numeric ? {} : {body:JSON.stringify({usernames:[query],excludeBannedUsers:true})}), signal:AbortSignal.timeout(8000)
  });
  if (!response.ok) throw Error('Roblox no está disponible. Inténtalo de nuevo.');
  const result = await response.json(); const user = numeric ? result : result.data?.[0];
  if (!Number.isSafeInteger(user?.id) || !user?.name) throw Error('No encontramos esa cuenta de Roblox.');
  const image = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`,{signal:AbortSignal.timeout(8000)});
  const thumbnail = image.ok ? (await image.json()).data?.[0]?.imageUrl : '';
  return {id:String(user.id),name:user.name,displayName:user.displayName || user.name,avatarUrl:thumbnail || ''};
}
export default async (request: Request) => {
  const url = new URL(request.url), action=url.searchParams.get('action') || 'thread';
  const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
  if (!['GET','POST','PUT','DELETE'].includes(request.method)) return reply({error:'Método no permitido.'},405);
  if (request.method!=='GET' && request.headers.get('origin')!==url.origin) return reply({error:'Origen no permitido.'},403);
  try {
    if(action==='roblox' && request.method==='GET') return reply({roblox:await lookupRoblox(url.searchParams.get('q')||'')});
    let legacySession=false;
    let user: {id:string,email?:string,confirmedAt?:string,userMetadata?:Record<string,unknown>} | null = await getUser();
    // Preserve existing account sessions while new registrations use Identity.
    if (!user && request.headers.get('authorization')?.startsWith('Bearer ') && request.headers.get('x-supabase-key')) {
      const result=await fetch('https://cbkrpyfkteomcukdisdw.supabase.co/auth/v1/user',{headers:{Authorization:request.headers.get('authorization')!,apikey:request.headers.get('x-supabase-key')!},signal:AbortSignal.timeout(8000)});
      if(result.ok){const legacy=await result.json();if(legacy.email_confirmed_at){legacySession=true;user={id:legacy.id,email:legacy.email,confirmedAt:legacy.email_confirmed_at,userMetadata:legacy.user_metadata};}}
    }
    const db=getDatabase();
    if(action==='import'&&request.method==='POST'){
      if(!user?.email||!user.confirmedAt)return reply({error:'Inicia sesión para conservar tu contenido anterior.'},401);
      if(!legacySession)return reply({ok:true});
      const script=url.searchParams.get('script')||'';if(script&&!catalogIds.includes(script))return reply({error:'Código no encontrado.'},404);
      await importCommunity(request,user,script);return reply({ok:true});
    }
    if(action==='profile' && request.method==='GET') {
      const id=url.searchParams.get('user') || user?.id;
      if(!id)return reply({error:'Inicia sesión.'},401);
      const rows=await db.sql`SELECT * FROM member_profiles WHERE user_id=${id}`;
      if(rows[0]){const profile=rows[0];if(id===user?.id)profile.is_creator=user?.email?.toLowerCase()===creatorEmail;if(id!==user?.id&&!profile.show_roblox){profile.roblox_id='';profile.roblox_username='';}return reply({profile,mine:id===user?.id});}
      return reply({profile:{user_id:id,display_name:id===user?.id ? String(user?.userMetadata?.full_name || 'Miembro RCC') : 'Miembro RCC',avatar_url:id===user?.id ? String(user?.userMetadata?.avatar_url||'') : '',roblox_id:id===user?.id ? String(user?.userMetadata?.roblox_id||'') : '',roblox_username:id===user?.id ? String(user?.userMetadata?.roblox_username||'') : '',is_creator:id===user?.id && user?.email?.toLowerCase()===creatorEmail},mine:id===user?.id});
    }
    if(action==='favorites' && request.method==='GET'){
      const id=url.searchParams.get('user')||user?.id;
      if(!id)return reply({error:'Inicia sesión.'},401);
      return reply({ids:(await db.sql`SELECT script_id FROM favorites WHERE user_id=${id} ORDER BY created_at DESC`).map(r=>r.script_id)});
    }
    const script=url.searchParams.get('script')||'';
    if(['thread','comment','favorite','like'].includes(action)&&!catalogIds.includes(script))return reply({error:'Código no encontrado.'},404);
    if(action==='thread' && request.method==='GET'){
      const rows=await db.sql`SELECT c.id,c.user_id,c.body AS text,c.parent_id,c.created_at,c.edited_at,p.display_name,p.avatar_url,p.banner_url,p.text_color,p.name_effect,p.banner_effect,p.is_creator FROM comments c LEFT JOIN member_profiles p ON p.user_id=c.user_id WHERE c.script_id=${script} ORDER BY c.created_at ASC LIMIT 500`;
      const counts=await db.sql`SELECT count(*)::int AS total FROM votes WHERE script_id=${script}`;
      const liked=user?await db.sql`SELECT script_id FROM votes WHERE script_id=${script} AND user_id=${user.id}`:[];
      return reply({comments:rows.map(r=>({...r,mine:r.user_id===user?.id})),likes:counts[0].total,liked:!!liked.length});
    }
    if(!user?.email || !user.confirmedAt)return reply({error:'Inicia sesión y confirma tu correo para continuar.'},401);
    if(action==='favorite' || action==='like'){
      if(!['PUT','DELETE'].includes(request.method))return reply({error:'Método no permitido.'},405);
      if(action==='favorite'){
        if(request.method==='PUT')await db.sql`INSERT INTO favorites(user_id,script_id) VALUES(${user.id},${script}) ON CONFLICT DO NOTHING`;
        else await db.sql`DELETE FROM favorites WHERE user_id=${user.id} AND script_id=${script}`;
      }else{
        if(request.method==='PUT')await db.sql`INSERT INTO votes(user_id,script_id) VALUES(${user.id},${script}) ON CONFLICT DO NOTHING`;
        else await db.sql`DELETE FROM votes WHERE user_id=${user.id} AND script_id=${script}`;
      }
      return reply({ok:true});
    }
    if(action==='comment'&&request.method==='DELETE'){
      const id=url.searchParams.get('id')||'';if(!uuid.test(id))return reply({error:'Comentario inválido.'},400);
      const rows=await db.sql`DELETE FROM comments WHERE id=${id} AND script_id=${script} AND user_id=${user.id} RETURNING id`;
      return reply(rows.length?{ok:true}:{error:'Solo puedes eliminar tus comentarios.'},rows.length?200:403);
    }
    const raw=await request.text();if(raw.length>12000)return reply({error:'Contenido demasiado largo.'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'Datos inválidos.'},400);}
    if(action==='profile'&&request.method==='PUT'){
      const name=String(body.display_name||'').trim(),avatar=String(body.avatar_url||'').trim(),banner=String(body.banner_url||'').trim(),bio=String(body.bio||'').trim(),color=String(body.text_color||'#e8e5df');
      const safeURL=(v:string)=>{try{return !v || (v.length<=2000 && new URL(v).protocol==='https:');}catch{return false;}};
      if(!name||name.length>80||bio.length>240||!safeURL(avatar)||!safeURL(banner)||!/^#[a-f0-9]{6}$/i.test(color))return reply({error:'Revisa el nombre, biografía, color y enlaces HTTPS.'},400);
      const creator=user.email.toLowerCase()===creatorEmail;
      const nameEffect=String(body.name_effect||'none'),bannerEffect=String(body.banner_effect||'none');
      if(!effects.includes(nameEffect)||!effects.includes(bannerEffect)||(!creator&&(nameEffect!=='none'||bannerEffect!=='none')))return reply({error:'Estos efectos son exclusivos del creador.'},403);
      const roblox=body.roblox_query ? await lookupRoblox(String(body.roblox_query)) : null;
      await db.sql`INSERT INTO member_profiles(user_id,display_name,avatar_url,banner_url,bio,text_color,roblox_id,roblox_username,show_roblox,name_effect,banner_effect,is_creator) VALUES(${user.id},${name},${avatar||roblox?.avatarUrl||''},${banner},${bio},${color},${roblox?.id||''},${roblox?.name||''},${!!body.show_roblox},${nameEffect},${bannerEffect},${creator}) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,avatar_url=excluded.avatar_url,banner_url=excluded.banner_url,bio=excluded.bio,text_color=excluded.text_color,roblox_id=excluded.roblox_id,roblox_username=excluded.roblox_username,show_roblox=excluded.show_roblox,name_effect=excluded.name_effect,banner_effect=excluded.banner_effect,is_creator=excluded.is_creator`;
      return reply({ok:true});
    }
    if(action==='comment'&&['PUT','POST'].includes(request.method)){
      const text=String(body.text||'').trim();if(!text||text.length>2000)return reply({error:'Escribe entre 1 y 2000 caracteres.'},400);
      if(request.method==='PUT'){
        const id=url.searchParams.get('id')||'';if(!uuid.test(id))return reply({error:'Comentario inválido.'},400);
        const rows=await db.sql`UPDATE comments SET body=${text},edited_at=now() WHERE id=${id} AND user_id=${user.id} AND script_id=${script} RETURNING id`;
        return reply(rows.length?{ok:true}:{error:'Solo puedes editar tus comentarios.'},rows.length?200:403);
      }
      const parent=body.parent_id||null;
      if(parent){if(!uuid.test(parent))return reply({error:'Respuesta inválida.'},400);const rows=await db.sql`SELECT id FROM comments WHERE id=${parent} AND script_id=${script}`;if(!rows.length)return reply({error:'El comentario original ya no existe.'},409);}
      const author=String(user.userMetadata?.full_name||'Miembro RCC').slice(0,80);
      await db.sql`INSERT INTO comments(script_id,user_id,author,body,parent_id) VALUES(${script},${user.id},${author},${text},${parent})`;
      return reply({ok:true},201);
    }
    return reply({error:'Operación no permitida.'},405);
  } catch(error){return reply({error:action==='roblox'||action==='profile' ? 'No se pudo guardar o consultar el perfil. Revisa el usuario de Roblox e inténtalo de nuevo.' : 'No se pudo completar la operación. Inténtalo de nuevo.'},503);}
};
export const config: Config={path:'/api/members'};
