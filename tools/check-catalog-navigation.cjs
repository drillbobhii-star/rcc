// Run with an external jsdom install: node tools/check-catalog-navigation.cjs <node_modules>.
// Exercises real catalog handlers without external services, ads or script execution.
const {JSDOM}=require(require('node:path').join(process.argv[2],'jsdom'));
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const catalog=require('./catalog-store.cjs').readCatalog();
const html=fs.readFileSync('index.html','utf8');
const dom=new JSDOM(html,{url:'https://rcc-3m0.pages.dev',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom,context=dom.getInternalVMContext();
let getFailure=false,postFailure=false,gets=0,posts=[],intervals=[];
const id=catalog[0].id;
window.fetch=async(url,options={})=>{
 if(url==='scripts.json'||/^catalog\/part-/.test(url))return {ok:true,json:async()=>JSON.parse(fs.readFileSync(url,'utf8'))};
 assert.equal(new URL(url).hostname,'cosmic-cucurucho-6280c8.netlify.app');
 assert.equal(options.credentials,'omit');
 if(options.method==='POST'){posts.push(JSON.parse(options.body));return {ok:!postFailure,json:async()=>({ok:true})};}
 gets++;return {ok:!getFailure,json:async()=>({items:[{id,total:7,copies:5,downloads:2}]})};
};
window.matchMedia=()=>({matches:false});window.scrollTo=()=>{};
window.setInterval=(fn,delay)=>{intervals.push({fn,delay});return intervals.length;};
window.setTimeout=(fn,delay)=>delay<100?setTimeout(fn,0):0;
window.clearTimeout=()=>{};
vm.runInContext(fs.readFileSync('assets/catalog-filters.js','utf8'),context);
vm.runInContext(fs.readFileSync('assets/catalog-loader.js','utf8'),context);
const main=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('let currentUser = null;'));
vm.runInContext(main.replace('initializeAuth();',''),context);
vm.runInContext(fs.readFileSync('assets/trends-config.js','utf8'),context);
vm.runInContext(fs.readFileSync('assets/release17.js','utf8'),context);
const el=id=>window.document.getElementById(id);
const click=id=>el(id).click();
const run=code=>vm.runInContext(code,context);
const flush=()=>new Promise(resolve=>setTimeout(resolve,10));
const sidebar=(container,text)=>[...el(container).children].find(e=>e.textContent.includes(text)).click();
(async()=>{
 await flush();assert.equal(run('scripts.length'),catalog.length);
 click('webTab');assert.equal(run('catalogSection'),'web');
 el('tagFilter').value='Matemáticas';el('environmentFilter').value='browser';el('search').value='imposible';run('render()');
 sidebar('platformList','FiveM');assert.equal(run('catalogSection'),'all');assert.equal(run('filterPlatform'),'fivem');assert.equal(el('search').value,'');assert.equal(el('tagFilter').value,'');assert.equal(el('environmentFilter').value,'all');assert(!el('scripts').querySelector('.empty'));
 click('gamesTab');el('gameFilter').value=catalog.find(s=>s.game).game;run('render()');
 sidebar('typeList','Fuente (Source)');assert.equal(run('filterType'),'source');assert.equal(el('gameFilter').value,'all');assert(!el('scripts').querySelector('.empty'));
 // Unknown means unknown, not both. Missing/blank criteria are neutral.
 const filters=window.RCCCatalogFilters;
 assert(!filters.matches({device:'both'},{device:'unknown'}));assert(filters.matches({device:'both'},{device:'pc'}));
 assert(filters.matches(catalog[0],{}));assert(filters.matches(catalog[0],{query:'   ',tag:'',platform:''}));
 assert(filters.matches({name:'Árbol y acción'},{query:'arbol accion'}));
 assert(!filters.matches({name:'Árbol'},{query:'acción'}));
 // Recent must clear hidden game, verification and tag filters.
 run(`recentIds=[${JSON.stringify(id)}]`);el('verificationFilter').value='js-syntax';click('recentBtn');assert.equal(run('showRecent'),true);assert(el('scripts').querySelector('.card'));assert.equal(el('verificationFilter').value,'all');
 click('webTab');el('environmentFilter').value='client';run('render()');assert(el('activeFilters').textContent.includes('Entorno:'));click('resetFilters');assert.equal(run('catalogSection'),'web');assert(el('scripts').querySelector('.card'));assert.equal(el('activeFilters').children.length,0);
 // Chips remove the same criteria used by the matcher.
 el('search').value='Matemáticas';run('render()');assert(el('activeFilters').textContent.includes('Búsqueda:'));el('activeFilters').querySelector('button').click();assert.equal(el('search').value,'');
 click('trendingTab');await flush();assert.equal(run('releaseView'),'trending');assert.equal(el('scripts').querySelectorAll('.card').length,1);assert(el('scripts').textContent.includes('5 copias · 2 descargas'));assert(!el('trendsStatus').hidden);
 click('resetFilters');assert.equal(run('releaseView'),'trending');assert.equal(el('trendingTab').getAttribute('aria-pressed'),'true');
 getFailure=true;await run('loadTrends()');assert(el('trendsStatus').textContent.includes('última consulta'));assert.equal(el('scripts').querySelectorAll('.card').length,1);
 getFailure=false;await run('loadTrends()');assert(!el('trendsStatus').textContent.includes('No se pudo actualizar'));
 await run(`recordCatalogAction(${JSON.stringify(id)},'copy')`);await run(`recordCatalogAction(${JSON.stringify(id)},'download')`);assert.equal(posts[0].visitorId,posts[1].visitorId);assert.match(posts[0].visitorId,/^[a-f0-9-]{36}$/);
 postFailure=true;await run(`recordCatalogAction(${JSON.stringify(id)},'copy')`);assert(el('trendsStatus').textContent.includes('No se pudo registrar'));
 const before=gets;intervals.find(i=>i.delay===60000).fn();await flush();assert( gets>before );
 // Switching out of trends clears its special mode and status.
 sidebar('platformList','FiveM');assert.equal(run('releaseView'),'');assert(el('trendsStatus').hidden);assert(el('scripts').querySelector('.card'));
 assert.equal(el('libraryTab').getAttribute('aria-pressed'),'true');
 // Loading and failed downloads must never claim that the selected category has no scripts.
 run("catalogStatus='loading';render()");assert(el('scripts').textContent.includes('Cargando códigos'));
 run("catalogStatus='error';render()");assert(el('retryCatalog'));
 const tagCount=el('tagFilter').options.length;click('retryCatalog');await flush();
 assert.equal(run('catalogStatus'),'ready');assert.equal(el('tagFilter').options.length,tagCount);
 assert(el('scripts').querySelector('.card'));
 console.log('Catalog navigation OK: hidden filters, section transitions, chips, unknown devices, recent, trends CORS client, refresh, stale state and write errors.');
 dom.window.close();
})().catch(error=>{console.error(error.message);dom.window.close();process.exitCode=1;});
