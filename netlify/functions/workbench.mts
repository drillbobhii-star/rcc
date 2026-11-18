import type { Config, Context } from '@netlify/functions';
import { getDatabase } from '@netlify/database';
export default async (request: Request, context: Context) => {
  const headers = {'Cache-Control':'private, no-store'};
  if (!['GET','POST'].includes(request.method)) return new Response(null,{status:405,headers:{...headers,Allow:'GET, POST'}});
  if (request.method==='POST' && request.headers.get('origin')!==new URL(request.url).origin) return new Response(null,{status:403,headers});
  let id=context.cookies.get('rcc_workbench');
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) id=crypto.randomUUID();
  context.cookies.set({name:'rcc_workbench',value:id,path:'/',httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'Lax',maxAge:31536000});
  try {
    const db=getDatabase();
    if(request.method==='POST'){
      if(Number(request.headers.get('content-length')||0)>2048)return new Response(null,{status:413,headers});
      const raw=await request.text();if(raw.length>2048)return new Response(null,{status:413,headers});
      let body;try{body=JSON.parse(raw);}catch{return new Response(null,{status:400,headers});}
      if(!body||typeof body!=='object')return new Response(null,{status:400,headers});
      await db.sql`INSERT INTO workbench_preferences(id) VALUES (${id}) ON CONFLICT DO NOTHING`;
      if(body.settings){
        const settings=JSON.stringify({motion:body.settings.motion==='off'?'off':'system',focus:body.settings.focus==='focus'?'focus':'normal'});
        await db.sql`UPDATE workbench_preferences SET settings=${settings}::jsonb WHERE id=${id}`;
      }
      if(typeof body.toggleProfile==='string'&&/^[0-9a-f-]{36}$/i.test(body.toggleProfile)){
        const profile=body.toggleProfile;
        await db.sql`UPDATE workbench_preferences SET profiles=CASE WHEN ${profile}=ANY(profiles) THEN array_remove(profiles,${profile}) WHEN cardinality(profiles)<200 THEN array_append(profiles,${profile}) ELSE profiles END WHERE id=${id}`;
      }
    }
    const rows=await db.sql`SELECT settings,profiles FROM workbench_preferences WHERE id=${id}`;
    return Response.json(rows[0]||{settings:{},profiles:[]},{headers});
  }catch{return Response.json({error:'Preferencias temporalmente no disponibles.'},{status:503,headers});}
};
export const config:Config={path:'/api/workbench'};
