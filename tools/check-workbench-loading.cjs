const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const manifest=JSON.parse(fs.readFileSync('scripts.json'));
let trigger,requests=[],first;
const listeners=new Map();
const document={
 createElement(){return {addEventListener(name,fn){if(name==='click')trigger=fn;},remove(){}};},
 getElementById(){return {addEventListener(){},removeEventListener(){}};},
 querySelector(){return {append(){}};},
 addEventListener(name,fn){listeners.set(name,fn);},
 removeEventListener(name){listeners.delete(name);}
};
const ctx={window:{},document,AbortSignal,setTimeout,fetch:async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(url.slice(1),'utf8'))};}};
vm.runInNewContext(fs.readFileSync('assets/catalog-loader.js','utf8'),ctx);
(async()=>{
 const pending=ctx.window.RCCCatalogLoader.load({onBatch:batch=>{first??=batch;}});
 await new Promise(resolve=>setTimeout(resolve,50));
 assert.equal(requests.length,2,'Only manifest and first collection load before user demand');
 assert.equal(first.scripts.length,27);
 assert.equal(first.complete,false);
 trigger();
 const rows=await pending;
 assert.equal(rows.length,manifest.total);
 assert.equal(new Set(rows.map(row=>row.id)).size,manifest.total);
 console.log('Workbench demand loading OK: 27 initial examples; full catalog only after interaction.');
})().catch(e=>{console.error(e);process.exitCode=1;});
