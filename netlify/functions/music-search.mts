import type { Config } from '@netlify/functions';
import { searchYouTube } from './lib/youtube-search.mts';

export default async (request:Request) => {
  const headers={'Cache-Control':'public, max-age=120'};
  if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
  const q=new URL(request.url).searchParams.get('q')?.trim();
  if(!q||q.length>160||/[\u0000-\u001f]/.test(q))return Response.json({error:'Escribe una búsqueda de hasta 160 caracteres.'},{status:400});
  try{
    const videos=(await searchYouTube(q+' música')).slice(0,12);
    return Response.json({videos,query:q,source:'YouTube',personalized:false},{headers});
  }catch{
    return Response.json({error:'YouTube no respondió a la búsqueda. Reintenta o pega el enlace de una canción.'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
};
export const config:Config={path:'/api/music-search'};
