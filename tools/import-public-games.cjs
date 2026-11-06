// Import public free listings as static catalog content. Never fetch or execute remote code.
const {readCatalog,writeCatalog}=require('./catalog-store.cjs');
const denied=/steal|token.?log|cookie.?log|account.?hack|beam|phish|grabber|dupe.?robux|free.?robux/i;
async function main(){
  const catalog=readCatalog(), ids=new Set(catalog.map(x=>x.id));
  const rawUrls=new Set(catalog.map(x=>x.code.match(/https:\/\/[^"\s)]+/)?.[0]).filter(Boolean));
  const target=Number(process.argv[2]||2400);
  if(!Number.isSafeInteger(target)||target<1||target>10000)throw Error('Target must be between 1 and 10000');
  let added=0,pages=0;const checked=new Date().toISOString().slice(0,10);
  for(let page=1;page<=800&&added<target;page++){
    let response;
    try{response=await fetch(`https://rscripts.net/api/v2/scripts?page=${page}&orderBy=date&sort=desc`,{signal:AbortSignal.timeout(20000)});}catch{console.log('Listing request unavailable; retaining completed pages.');break;}
    if(!response.ok){console.log(`Listing paused: HTTP ${response.status}`);break;}
    const data=await response.json();if(!Array.isArray(data.scripts))throw Error('Unexpected listing format');
    if(!data.scripts.length)break;
    pages++;
    for(const row of data.scripts){
      if(added>=target)break;
      const id='games_rs_'+row._id;
      if(!/^[a-f0-9]{24}$/.test(row._id)||ids.has(id)||row.paid!==false||row.private||typeof row.title!=='string'||denied.test(row.title)||typeof row.game?.title!=='string')continue;
      let raw;try{raw=new URL(row.rawScript);}catch{continue;}
      if(raw.origin!=='https://rscripts.net'||!/^\/raw\/[\w.-]+\.txt$/.test(raw.pathname)||raw.search||raw.hash||rawUrls.has(raw.href))continue;
      const date=Number.isFinite(Date.parse(row.createdAt))?new Date(row.createdAt).toISOString():checked;
      const image=[row.game.imgurl,row.image].find(x=>typeof x==='string'&&/^https:\/\/(?:[\w-]+\.)?rbxcdn\.com\//.test(x));
      const gameId=/^\d+$/.test(String(row.game.placeId))?String(row.game.placeId):'0';
      const entry={id,name:row.title.slice(0,180),description:`${row.game.title.slice(0,180)}. ${row.keySystem?'Requiere clave.':'Sin clave indicada.'} Código remoto de la comunidad; funcionamiento sin verificar.`,level:'free',device:'unknown',platform:'roblox',type:'loadstring',executors:['Ejecutor externo (sin verificar)'],tags:['Juegos','Comunidad',row.keySystem?'Con clave':'Sin clave'],version:'1.0',created_at:date,reference_image:image,code:`loadstring(game:HttpGet(${JSON.stringify(raw.href)}))()`,game:row.game.title.slice(0,180),game_id:gameId,catalog_section:'games',compatibility:{environment:'client',runtime:'Roblox · ejecutor externo',context:'Cliente de Roblox; publicación de la comunidad.',requirements:'API loadstring y game:HttpGet. Revisar el contenido remoto antes de ejecutarlo.',verification:'unverified',test_details:`Metadatos revisados el ${checked}; código remoto sin descargar ni ejecutar.`,mobile_status:'PC, Android e iOS sin comprobar.',executor_status:'unverified',sources:[raw.href],checked_at:checked}};
      catalog.push(entry);ids.add(id);rawUrls.add(raw.href);added++;
    }
    if(page%25===0)console.log(`${pages} pages checked; ${added} unique new entries`);
    if(page>=data.info?.maxPages)break;
    await new Promise(resolve=>setTimeout(resolve,150));
  }
  if(added)writeCatalog(catalog);
  console.log(`Added ${added} unique listings; ${catalog.length} total; ${pages} pages checked.`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
