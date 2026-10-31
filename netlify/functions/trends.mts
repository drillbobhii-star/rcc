import type { Config, Context } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/netlify-db';
import { sql, desc, gte } from 'drizzle-orm';
import { catalogActions } from '../../db/schema.js';
import ids from './lib/catalog-ids.json' with { type: 'json' };
export default async (request: Request, context: Context) => {
  const url=new URL(request.url);
  const origin=request.headers.get('origin');
  // Cloudflare production + its deployment previews; same-origin Netlify stays supported.
  const cloudflareOrigin=origin ? /^https:\/\/(?:[a-z0-9-]+\.)?rcc-3m0\.pages\.dev$/.test(origin) : false;
  const permitted=!origin || origin===url.origin || cloudflareOrigin;
  const headers: Record<string,string> = { 'Cache-Control': 'no-store', 'Vary':'Origin' };
  if(origin && permitted){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Content-Type';headers['Access-Control-Max-Age']='600';}
  const respond = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if(!permitted)return respond({error:'Origen no permitido.'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if (!['GET', 'POST'].includes(request.method)) return new Response(null, {status:405,headers:{...headers,Allow:'GET, POST'}});
  if(request.method==='POST' && !origin)return respond({error:'Origen requerido.'},403);
  try {
    const db=drizzle({schema:{catalogActions}});
    if(request.method==='POST'){
      if(Number(request.headers.get('content-length'))>2048)return respond({error:'Solicitud demasiado grande.'},413);
      const raw=await request.text();if(raw.length>2048)return respond({error:'Solicitud demasiado grande.'},413);
      let data;try{data=JSON.parse(raw);}catch{return respond({error:'Solicitud inválida.'},400);}
      if(!ids.includes(data?.id)||!['copy','download'].includes(data?.action))return respond({error:'Acción inválida.'},400);
      const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
      if(data.visitorId!==undefined && (typeof data.visitorId!=='string'||!uuid.test(data.visitorId)))return respond({error:'Identificador inválido.'},400);
      const saved=data.visitorId || context.cookies.get('rcc_trend_visitor');
      const visitorId=saved&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved)?saved:crypto.randomUUID();
      await db.insert(catalogActions).values({visitorId,scriptId:data.id,action:data.action,day:new Date().toISOString().slice(0,10)}).onConflictDoNothing();
      if(!data.visitorId)context.cookies.set({name:'rcc_trend_visitor',value:visitorId,httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'Lax',path:'/',maxAge:31536000});
      return respond({ok:true});
    }
    const since=new Date(Date.now()-29*86400000).toISOString().slice(0,10);
    const total=sql<number>`count(*)::int`;
    const items=await db.select({id:catalogActions.scriptId,total,copies:sql<number>`count(*) filter (where action = 'copy')::int`,downloads:sql<number>`count(*) filter (where action = 'download')::int`}).from(catalogActions).where(gte(catalogActions.day,since)).groupBy(catalogActions.scriptId).orderBy(desc(total),catalogActions.scriptId).limit(200);
    return respond({items,period:'30 días',updatedAt:new Date().toISOString()});
  }catch{return respond({error:'Tendencias no disponibles.'},503);}
};
export const config: Config={path:'/api/trends'};
