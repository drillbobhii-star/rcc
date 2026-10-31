// Verify static assets and browser loading without a build or external dependencies.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const vm=require('node:vm'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {readCatalog,writeCatalog,MAX_PART_BYTES}=require('./catalog-store.cjs');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts.json'),'utf8'));
const catalog=readCatalog();
assert.equal(manifest.format,'rcc-catalog-v1');
assert.equal(manifest.total,catalog.length);
assert(fs.statSync(path.join(root,'scripts.json')).size<64*1024,'Manifest must remain small');
assert(manifest.parts.every(p=>p.bytes<=MAX_PART_BYTES));
assert(manifest.parts.reduce((sum,p)=>sum+p.count,0)===catalog.length);
const ids=JSON.parse(fs.readFileSync(path.join(root,'netlify/functions/lib/catalog-ids.json'),'utf8'));
assert.deepEqual(catalog.map(s=>s.id),ids);
// Inspect publishable source files only, never dependency, environment or git internals.
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
for(const file of files){
  const target=path.join(root,file);
  if(fs.existsSync(target)&&fs.statSync(target).isFile())assert(fs.statSync(target).size<=25*1024*1024,`${file}: exceeds Cloudflare's 25 MiB limit`);
}
const source=fs.readFileSync(path.join(root,'assets/catalog-loader.js'),'utf8');
const newLoader=fetch=>{const context=vm.createContext({window:{},fetch,AbortController});vm.runInContext(source,context);return context.window.RCCCatalogLoader;};
const plain=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 let active=0,peak=0;const progress=[];
 const loader=newLoader(async file=>{
   active++;peak=Math.max(peak,active);
   await new Promise(resolve=>setTimeout(resolve,file===manifest.parts[0].file?5:1));active--;
   return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))};
 });
 const loaded=await loader.load({onProgress:p=>progress.push(p)});
 assert.deepEqual(plain(loaded),catalog,'All original fields, ordering and code must survive loading');
 assert(peak<=3&&peak>1,'Part requests must use bounded parallelism');
 assert.equal(progress.at(-1).loaded,catalog.length);assert.equal(progress.at(-1).total,catalog.length);
 // A missing file must fail as a whole, so UI retry can never silently lose scripts.
 let failing=true;
 const retryLoader=newLoader(async file=>({ok:!(failing&&file===manifest.parts[1].file),json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}));
 await assert.rejects(()=>retryLoader.load(),/cargar una parte/);
 failing=false;assert.equal((await retryLoader.load()).length,catalog.length);
 // Invalid paths cannot make the loader request unrelated URLs.
 const invalid=plain(manifest);invalid.parts[0].file='https://unrelated.test/data.json';
 const invalidLoader=newLoader(async file=>{assert.equal(file,'scripts.json');return {ok:true,json:async()=>invalid};});
 await assert.rejects(()=>invalidLoader.load(),/Parte de catálogo inválida/);
 // Reject missing records and ID collisions rather than displaying a partial catalog.
 for(const mutation of ['missing','duplicate']){
   const brokenLoader=newLoader(async file=>({ok:true,json:async()=>{
     const data=JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
     if(file===manifest.parts[0].file){if(mutation==='missing')data.pop();else data[1].id=data[0].id;}
     return data;
   }}));
   await assert.rejects(()=>brokenLoader.load());
 }
 // Future catalog edits keep the same small-file format, without a build-time step.
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'rcc-catalog-'));
 try{
   const sample=[{id:'one',code:'-- áéíóú'.repeat(130000)},{id:'two',code:'-- Unicode ñ'.repeat(130000)}];
   const first=writeCatalog(sample,temp);assert.equal(first.parts.length,2);assert.deepEqual(readCatalog(temp),sample);
   const second=writeCatalog(sample.slice(0,1),temp);assert.equal(second.parts.length,1);assert.equal(fs.readdirSync(path.join(temp,'catalog')).length,1);
   assert.throws(()=>writeCatalog([{id:'large',code:'x'.repeat(MAX_PART_BYTES)}],temp),/exceeds the part limit/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 console.log(`Static catalog OK: ${catalog.length} entries, ${manifest.parts.length} parts, max ${(Math.max(...manifest.parts.map(p=>p.bytes))/1024/1024).toFixed(3)} MiB; full browser load, failure/retry, integrity and 25 MiB source limit.`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
