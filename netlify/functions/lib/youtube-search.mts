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

export async function searchYouTube(query:string) {
  const target=new URL('https://www.youtube.com/results');
  target.searchParams.set('search_query',query);target.searchParams.set('hl','es');
  const response=await fetch(target,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'es,en;q=0.8'}});
  if(!response.ok||!response.body)throw new Error('YouTube unavailable');
  const reader=response.body.getReader(),decoder=new TextDecoder();let size=0,html='';
  try{
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4*1024*1024)throw new Error('Search too large');html+=decoder.decode(value,{stream:true});}
    html+=decoder.decode();
  }finally{await reader.cancel().catch(()=>{});}
  // The parser walks a stack, so reverse to retain YouTube's result order.
  return parseYouTubeResults(html).reverse();
}
