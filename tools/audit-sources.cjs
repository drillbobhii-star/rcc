// Refresh publication evidence only. Remote Lua is never downloaded or executed.
const fs = require('node:fs');
const {readCatalog, writeCatalog} = require('./catalog-store.cjs');
const denied = /steal|token.?log|cookie.?log|account.?hack|beam|phish|grabber|dupe.?robux|free.?robux/i;
let stamp = new Date().toISOString();
const report = {checkedAt:stamp, total:0, sources:{}, reviewed:0, patched:0, changed:0, added:0, unavailable:0, comments:'Los comentarios externos no están disponibles mediante los endpoints consultados. Los comentarios RCC se resumen al abrir la ficha.', limitations:'Revisión de metadatos públicos. No demuestra ejecución, ausencia de sanciones ni historial completo de versiones.'};
async function json(url) {
  for(let attempt=0;attempt<3;attempt++) {
    try {
      const r=await fetch(url,{signal:AbortSignal.timeout(12000)});
      if(!r.ok){const e=Error('HTTP '+r.status);e.status=r.status;throw e;}
      return await r.json();
    } catch(error){if(attempt===2||[403,404,429].includes(error.status))throw error;await new Promise(resolve=>setTimeout(resolve,600));}
  }
}
function evidence(entry,row,provider,source) {
  const history=Array.isArray(row.updates)?row.updates.filter(x=>Number.isFinite(Date.parse(x.at))).map(x=>({at:new Date(x.at).toISOString(),kind:x.kind==='edit'?'content':'note'})).slice(0,20):[];
  if(entry.review?.checkedAt===stamp){if(history.length)entry.review.history=history;return;}
  const previous=entry.review;
  const updated=provider==='ScriptBlox' ? row.contentUpdatedAt || (row.lastUpdateBy==='edit'?row.lastUpdate:null) : row.lastUpdated;
  const date=updated && Number.isFinite(Date.parse(updated)) ? new Date(updated).toISOString() : null;
  const changed=!!date && Date.parse(date)>Date.parse(previous?.sourceUpdatedAt || entry.created_at);
  entry.review={provider,source,checkedAt:stamp,status:row.isPatched===true?'patched':row.isPatched===false?'source-unpatched':'unknown',sourceUpdatedAt:date,publicationActivityAt:row.lastUpdate || row.lastUpdated || null,updateAvailable:changed,commentsStatus:'unavailable',declaredVerified:row.verified===true,...(history.length?{history}:{})};
  if(previous?.sourceUpdatedAt && previous.sourceUpdatedAt!==date) entry.review.previousSourceUpdatedAt=previous.sourceUpdatedAt;
  if(changed) report.changed++;
  if(entry.review.status==='patched')report.patched++;
  report.reviewed++;
}
async function main(){
  const rows=readCatalog();
  if(process.argv.includes('--resume')){Object.assign(report,JSON.parse(fs.readFileSync('assets/catalog-audit.json','utf8')));stamp=report.checkedAt;}
  report.total=rows.length;
  report.sources=rows.reduce((out,s)=>{const p=s.id.startsWith('games_sb_')?'ScriptBlox':s.id.startsWith('games_rs_')?'RScripts':'Otras fuentes';out[p]=(out[p]||0)+1;return out;},{});
  // Every entry retains its own source and an explicit pending state until a request succeeds.
  for(const row of rows)if(!row.review)row.review={status:'pending',source:row.compatibility?.sources?.find(x=>/^https:\/\//.test(x)) || null,commentsStatus:'unavailable'};
  const sb=rows.filter(s=>s.id.startsWith('games_sb_')&&(process.argv.includes('--history')?(s.review?.updateAvailable||s.review?.status==='patched'):s.review?.checkedAt!==stamp)); let cursor=0,stopped=false;
  async function worker(){while(cursor<sb.length&&!stopped){const s=sb[cursor++];const source=s.compatibility?.sources?.find(x=>x.startsWith('https://scriptblox.com/script/'));if(!source)continue;try{const d=await json('https://scriptblox.com/api/script/'+encodeURIComponent(source.split('/').pop()));if(d.script?._id===s.id.slice(9))evidence(s,d.script,'ScriptBlox',source);else report.unavailable++;}catch(e){report.unavailable++;if(e.status===429||e.status===403)stopped=true;}
    if(cursor%500===0)console.log('ScriptBlox: '+cursor+' publicaciones consultadas');}}
  await Promise.all(Array.from({length:4},worker));
  console.log('ScriptBlox: revisión finalizada; '+report.reviewed+' fichas contrastadas');
  const byId=new Map(rows.map(s=>[s.id,s])); const knownGames=new Set(rows.map(s=>String(s.game_id)).filter(x=>x&&x!=='0'));
  let consecutiveKnown=0;
  for(let page=1;page<=300&&!process.argv.includes('--history');page++){
    let d;try{d=await json('https://rscripts.net/api/v2/scripts?page='+page+'&orderBy=date&sort=desc');}catch{report.unavailable++;break;}
    if(!Array.isArray(d.scripts)||!d.scripts.length)break;
    for(const r of d.scripts){
      const id='games_rs_'+r._id, existing=byId.get(id);
      if(!/^[a-f0-9]{24}$/.test(r._id)||typeof r.slug!=='string'||!/^[-\w]+$/.test(r.slug))continue;
      const source='https://rscripts.net/script/'+r.slug;
      if(existing){evidence(existing,r,'RScripts',source);consecutiveKnown++;continue;}
      consecutiveKnown=0;
      if(report.added>=80||r.paid!==false||r.private||!r.game?.title||denied.test(r.title)||knownGames.has(String(r.game.placeId)))continue;
      let raw;try{raw=new URL(r.rawScript);}catch{continue;}
      if(raw.origin!=='https://rscripts.net'||!/^\/raw\/[\w.-]+\.txt$/.test(raw.pathname)||raw.search||raw.hash)continue;
      const referenceImage=[r.game.imgurl,r.image].find(value=>typeof value==='string'&&/^https:\/\/(?:(?:[\w-]+\.)?rbxcdn\.com\/|rscripts\.net\/assets\/(?:games|scripts)\/)/.test(value));
      const entry={id,reference_image:referenceImage,name:String(r.title).slice(0,180),description:r.game.title.slice(0,180)+'. '+(r.keySystem?'Requiere clave.':'Sin clave indicada.')+' Publicación externa; ejecución sin verificar.',level:'free',device:'unknown',platform:'roblox',type:'loadstring',executors:['Ejecutor externo (sin verificar)'],tags:['Juegos','Comunidad','Nueva incorporación',r.keySystem?'Con clave':'Sin clave'],version:'Sin versión publicada',created_at:r.createdAt,code:'loadstring(game:HttpGet('+JSON.stringify(raw.href)+'))()',game:r.game.title.slice(0,180),game_id:String(r.game.placeId||0),catalog_section:'games',compatibility:{environment:'client',runtime:'Roblox · ejecutor externo',context:'Publicación de la comunidad.',requirements:'loadstring y game:HttpGet. Revisar el contenido en la fuente.',verification:'unverified',test_details:'Metadatos consultados el '+stamp.slice(0,10)+'. Sin ejecutar código.',mobile_status:'Sin comprobar.',executor_status:'unverified',sources:[source,raw.href],checked_at:stamp.slice(0,10)}};
      evidence(entry,r,'RScripts',source);rows.push(entry);byId.set(id,entry);knownGames.add(entry.game_id);report.added++;
    }
    if(page%50===0)console.log('RScripts: '+page+' páginas consultadas');
    if(page>=d.info?.maxPages||consecutiveKnown>=2400)break;
  }
  report.total=rows.length;report.pending=rows.filter(s=>!s.review.checkedAt).length;
  report.pendingExternal=rows.filter(s=>/^games_(rs|sb)_/.test(s.id)&&!s.review.checkedAt).length;
  report.withHistory=rows.filter(s=>s.review?.history?.length).length;
  writeCatalog(rows);fs.writeFileSync('assets/catalog-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
