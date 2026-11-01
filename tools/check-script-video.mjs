import assert from 'node:assert/strict';
import lookup,{parseYouTubeResults,matchVideos} from '../netlify/functions/script-video.mts';
import ids from '../netlify/functions/lib/catalog-ids.json' with {type:'json'};
const fixture={contents:[{videoRenderer:{videoId:'gAzDfuaaPe8',title:{runs:[{text:'BEST Blox Fruits Script | AtherHub Auto Farm'}]},ownerText:{runs:[{text:'Atherhub Scripts'}]}}},{videoRenderer:{videoId:'0PutZY4qF_8',title:{runs:[{text:'Blox Fruits Auto Farm, Auto Level, Auto Raid'}]},ownerText:{runs:[{text:'Another channel'}]}}}]};
const html='<script>var ytInitialData = '+JSON.stringify(fixture)+';</script>';
const videos=parseYouTubeResults(html);assert.equal(videos.length,2);
assert.equal(matchVideos(videos,'Atherhub | Most Feature | Auto Level | Auto Raid','Blox Fruits').length,1);
assert.equal(matchVideos(videos,'Unrelated Hub','Blox Fruits').length,0);
assert.equal(matchVideos(videos,'Atherhub','Different Game').length,0);
assert.throws(()=>parseYouTubeResults('<html>Consent required</html>'));
assert.equal((await lookup(new Request('https://rcc.example/api/script-video',{method:'POST'}))).status,405);
assert.equal((await lookup(new Request('https://rcc.example/api/script-video?id=invalid&name=x&game=y'))).status,400);
const realFetch=globalThis.fetch;
try{
 globalThis.fetch=async()=>new Response(html);
 let response=await lookup(new Request('https://rcc.example/api/script-video?'+new URLSearchParams({id:ids[0],name:'Atherhub | Auto Raid',game:'Blox Fruits'})));
 assert.equal(response.status,200);assert.equal((await response.json()).videos.length,1);
 globalThis.fetch=async()=>new Response('Unavailable',{status:503});
 response=await lookup(new Request('https://rcc.example/api/script-video?'+new URLSearchParams({id:ids[0],name:'Atherhub',game:'Blox Fruits'})));
 assert.equal(response.status,502);
}finally{globalThis.fetch=realFetch;}
console.log('Script video lookup OK: public search parsing, game/hub matching, unrelated-video rejection, method/input guards and upstream failure.');
