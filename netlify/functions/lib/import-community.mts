import { getDatabase } from '@netlify/database';
import catalogIds from './catalog-ids.json' with { type:'json' };
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function importCommunity(request:Request,user:{id:string,email?:string},script:string){
  const db=getDatabase(),key=script?'thread:'+script:'account:'+user.id;
  if((await db.sql`SELECT key FROM community_imports WHERE key=${key}`).length)return;
  const headers={Authorization:request.headers.get('authorization')!,apikey:request.headers.get('x-supabase-key')!};
  async function read(table:string,filters:Record<string,string>){const all:Record<string,any>[]=[];for(let offset=0;;offset+=1000){const params=new URLSearchParams({...filters,select:'*',limit:'1000',offset:String(offset)});const response=await fetch('https://cbkrpyfkteomcukdisdw.supabase.co/rest/v1/'+table+'?'+params,{headers,signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('No se pudo importar el contenido anterior.');const rows=await response.json();if(!Array.isArray(rows))throw Error('Respuesta de importación inválida.');all.push(...rows);if(rows.length<1000)return all;if(offset>=19000)throw Error('La importación requiere dividir el historial.');}}
  let profiles:Record<string,any>[]=[],comments:Record<string,any>[]=[],favorites:Record<string,any>[]=[];
  if(script){comments=await read('comments',{script_id:'eq.'+script,order:'created_at.asc,id.asc'});const ids=[...new Set(comments.map(c=>c.user_id).filter(id=>uuid.test(id)))];for(let i=0;i<ids.length;i+=100)profiles.push(...await read('profiles',{user_id:'in.('+ids.slice(i,i+100).join(',')+')'}));}
  else [profiles,favorites]=await Promise.all([read('profiles',{user_id:'eq.'+user.id}),read('favorites',{user_id:'eq.'+user.id})]);
  const client=await db.pool.connect();
  try{
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
    if((await client.query('SELECT key FROM community_imports WHERE key=$1',[key])).rows.length){await client.query('COMMIT');return;}
    for(const p of profiles){if(!uuid.test(p.user_id))continue;const name=String(p.display_name||'Miembro RCC').slice(0,80),safe=(s:unknown)=>typeof s==='string'&&s.length<=2000&&/^https:\/\//i.test(s)?s:'';const creator=p.user_id===user.id&&user.email?.toLowerCase()==='drillbobhii@gmail.com';await client.query('INSERT INTO member_profiles(user_id,display_name,avatar_url,banner_url,text_color,roblox_username,is_creator) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id) DO NOTHING',[p.user_id,name,safe(p.avatar_url),safe(p.banner_url),/^#[a-f0-9]{6}$/i.test(p.text_color||'')?p.text_color:'#dce6f5',String(p.roblox_username||'').slice(0,24),!!creator]);}
    for(const f of favorites){if(!catalogIds.includes(f.script_id))continue;await client.query('INSERT INTO favorites(user_id,script_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,f.script_id]);}
    const valid=comments.filter(c=>uuid.test(c.id)&&uuid.test(c.user_id)&&String(c.text||'').trim().length>0&&String(c.text).length<=2000);
    for(const c of valid)await client.query('INSERT INTO comments(id,script_id,user_id,author,body,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[c.id,script,c.user_id,String(profiles.find(p=>p.user_id===c.user_id)?.display_name||'Miembro RCC').slice(0,80),c.text,Number.isFinite(Date.parse(c.created_at))?c.created_at:new Date().toISOString()]);
    const ids=new Set(valid.map(c=>c.id));
    for(const c of valid){if(!ids.has(c.parent_id)||c.id===c.parent_id)continue;const seen=new Set([c.id]);let next=c.parent_id,cycle=false;while(next){if(seen.has(next)){cycle=true;break;}seen.add(next);next=valid.find(r=>r.id===next)?.parent_id;}if(!cycle)await client.query('UPDATE comments SET parent_id=$1 WHERE id=$2 AND script_id=$3',[c.parent_id,c.id,script]);}
    await client.query('INSERT INTO community_imports(key) VALUES($1) ON CONFLICT DO NOTHING',[key]);await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
