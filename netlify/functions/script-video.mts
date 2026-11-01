import type { Config } from '@netlify/functions';
import ids from './lib/catalog-ids.json' with { type:'json' };

function normalize(value:string) {return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
export function parseYouTubeResults(html:string) {
  const marker=/(?:var\s+)?ytInitialData\s*=\s*/g.exec(html);
  if(!marker)throw new Error('Search data unavailable');
  const start=marker.index+marker[0].length;
  let depth=0,inString=false,escaped=false,end=-1;
  for(let i=start;i<html.length;i++){
    const char=html[i];
    if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;continue;}
    if(char==='"')inString=true;else if(char==='{')depth++;else if(char==='}'&&--depth===0){end=i+1;break;}
  }
  if(end<0)throw new Error('Incomplete search data');
  const root=JSON.parse(html.slice(start,end));
  const pending:unknown[]=[root],videos:{id:string,title:string,channel:string}[]=[],seen=new Set<string>();
  let visited=0;
  const text=(value:any)=>typeof value?.simpleText==='string'?value.simpleText:(value?.runs||[]).map((part:any)=>typeof part.text==='string'?part.text:'').join('');
  while(pending.length&&visited++<100000){
    const value:any=pending.pop();if(!value||typeof value!=='object')continue;
    const video=value.videoRenderer;
    if(video&&/^[\w-]{11}$/.test(video.videoId||'')&&!seen.has(video.videoId)){
      const title=text(video.title),channel=text(video.ownerText||video.longBylineText);
      if(title){videos.push({id:video.videoId,title:title.slice(0,300),channel:channel.slice(0,150)});seen.add(video.videoId);}
    }
    pending.push(...Object.values(value));
  }
  return videos;
}
export function matchVideos(videos:ReturnType<typeof parseYouTubeResults>,name:string,game:string) {
  const ignored=new Set('script scripts roblox the a an in of for and with no key keys working new best free auto farm all most features feature open source games game update version gui hub'.split(' '));
  const gameWords=normalize(game).split(' ').filter(word=>word.length>2&&!ignored.has(word));
  const identity=normalize(name).split(' ').filter(word=>word.length>2&&!ignored.has(word)&&!gameWords.includes(word)).slice(0,12);
  const hub=normalize(name).match(/\b([a-z0-9]+)\s*hub\b/)?.[1];
  return videos.map(video=>{
    const title=normalize(video.title),compact=title.replaceAll(' ','');
    const gameHit=gameWords.length>0&&gameWords.filter(word=>title.includes(word)).length>=Math.min(2,gameWords.length);
    const hits=identity.filter(word=>title.includes(word)).length;
    const hubHit=!!hub&&hub!=='script'&&compact.includes(hub+'hub');
    const exact=identity.length>=2&&hits>=Math.max(2,Math.ceil(identity.length*.65));
    return {video,score:(hubHit?20:0)+hits,match:gameHit&&(hub&&hub!=='script'?hubHit:exact)};
  }).filter(item=>item.match).sort((a,b)=>b.score-a.score).slice(0,3).map(item=>item.video);
}
export default async (request:Request) => {
  const headers={'Cache-Control':'no-store'};
  if(request.method!=='GET')return new Response(null,{status:405,headers:{...headers,Allow:'GET'}});
  const url=new URL(request.url),id=url.searchParams.get('id'),name=url.searchParams.get('name')?.trim(),game=url.searchParams.get('game')?.trim();
  if(!id||!ids.includes(id)||!name||name.length>300||!game||game.length>150)return Response.json({error:'Ficha inválida.'},{status:400,headers});
  const query=`${name.slice(0,180)} ${game} script showcase`;
  try{
    const target=new URL('https://www.youtube.com/results');target.searchParams.set('search_query',query);target.searchParams.set('hl','en');
    const response=await fetch(target,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'en-US,en;q=0.9'}});
    if(!response.ok||!response.body)throw new Error('YouTube unavailable');
    const reader=response.body.getReader();const decoder=new TextDecoder();let size=0,html='';
    try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024)throw new Error('Search too large');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
    const matches=matchVideos(parseYouTubeResults(html),name,game);
    return Response.json({videos:matches,query,source:'YouTube',matching:'title'}, {headers});
  }catch{return Response.json({error:'No se pudo consultar YouTube. Puedes reintentar o buscar en YouTube.',query},{status:502,headers});}
};
export const config:Config={path:'/api/script-video'};
