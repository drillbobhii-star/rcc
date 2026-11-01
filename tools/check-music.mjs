import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import lookup from '../netlify/functions/music-search.mts';

assert.equal((await lookup(new Request('https://rcc.example/api/music-search',{method:'POST'}))).status,405);
for(const query of ['', 'x'.repeat(161),'bad\u0000query'])assert.equal((await lookup(new Request('https://rcc.example/api/music-search?'+new URLSearchParams({q:query})))).status,400);
const realFetch=globalThis.fetch;
try{
  globalThis.fetch=async url=>{assert.equal(new URL(url).hostname,'www.youtube.com');assert.equal(new URL(url).searchParams.get('search_query'),'lofi música');return new Response('<script>var ytInitialData = '+JSON.stringify({contents:[{videoRenderer:{videoId:'kXB2Of4QrNQ',title:{simpleText:'Lo-fi session'},ownerText:{simpleText:'Music channel'}}}]})+';</script>');};
  const response=await lookup(new Request('https://rcc.example/api/music-search?q=lofi'));
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.personalized,false);assert.equal(data.videos[0].id,'kXB2Of4QrNQ');
  globalThis.fetch=async()=>new Response('unavailable',{status:503});assert.equal((await lookup(new Request('https://rcc.example/api/music-search?q=lofi'))).status,502);
}finally{globalThis.fetch=realFetch;}

function createHarness(){
  const nodes=new Map(),writes=[];
  function node(){return {value:'',hidden:true,children:[],dataset:{},handlers:{},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.handlers[k]=fn;},append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},querySelectorAll(){return this.children.filter(child=>child.dataset?.musicId);},scrollIntoView(){},focus(){}};}
  const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
  let options,player;
  const context={URL,URLSearchParams,AbortController,location:{origin:'https://rcc.example'},setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:()=>null,setItem:(k,v)=>writes.push(JSON.parse(v))},document:{getElementById:get,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){},createElement:node},window:{YT:{Player:function(id,config){options=config;player={plays:0,volume:0,state:0,loop:false,setVolume(v){this.volume=v;},getIframe:()=>({}),unMute(){},mute(){},playVideo(){this.plays++;},pauseVideo(){this.state=2;},getPlayerState(){return this.state;},loadPlaylist(p){this.playlist=p;},cuePlaylist(p){this.playlist=p;},setLoop(v){this.loop=v;}};return player;}}},fetch:async()=>({ok:true,json:async()=>({videos:[{id:'dQw4w9WgXcQ',title:'Test song',channel:'Test channel'}]})})};
  vm.runInNewContext(fs.readFileSync('assets/background-music.js','utf8'),context);
  return {get,options,player,writes};
}
const h=createHarness();h.options.events.onReady();assert.equal(h.options.videoId,'kXB2Of4QrNQ');assert.equal(h.player.volume,12);assert.equal(h.player.plays,1);
h.get('musicShow').handlers.click();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.get('musicExplorer').hidden,false);assert.equal(h.get('musicShow')['aria-expanded'],'true');assert.equal(h.get('musicResults').children.length,1);
h.get('musicResults').children[0].handlers.click();assert.equal(h.player.playlist.playlist[0],'dQw4w9WgXcQ');assert.equal(h.player.loop,true);
h.get('musicQuery').value='https://music.youtube.com/watch?v=kXB2Of4QrNQ';h.get('musicSearchForm').handlers.submit({preventDefault(){}});assert.equal(h.player.playlist.playlist[0],'kXB2Of4QrNQ');
h.get('musicQuery').value='https://evil.example/watch?v=dQw4w9WgXcQ';h.get('musicSearchForm').handlers.submit({preventDefault(){}});assert.equal(h.player.playlist.playlist[0],'kXB2Of4QrNQ');assert.match(h.get('musicSearchStatus').textContent,/válido/);
h.get('musicVolume').value='9';h.get('musicVolume').handlers.input();assert.equal(h.player.volume,9);assert.equal(h.writes.at(-1).volume,9);
h.options.events.onAutoplayBlocked();assert.equal(h.get('musicQuickToggle').textContent,'Reproducir música');
h.get('musicHide').handlers.click();assert.equal(h.get('musicExplorer').hidden,true);assert.equal(h.get('musicShow')['aria-expanded'],'false');
console.log('Music OK: search validation, public results, upstream failure, first track, low volume, disclosure, selection, loop, direct links, invalid host rejection, saved volume and autoplay fallback.');
