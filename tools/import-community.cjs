// Fetches public listing metadata only. Never evaluates scripts or remote loaders.
const fs = require('node:fs');
async function main() {
  const catalog = JSON.parse(fs.readFileSync('scripts.json', 'utf8'));
  const ids = new Set(catalog.map(s => s.id));
  const sources = new Set(catalog.flatMap(s => s.compatibility?.sources || []));
  const date = new Date().toISOString().slice(0,10);
  const target = Number(process.argv[2] || 2200);
  let added = 0;
  for (let page = 1; page <= 250 && added < target; page++) {
    const response = await fetch(`https://scriptblox.com/api/script/fetch?page=${page}&mode=free`, {signal: AbortSignal.timeout(25000)});
    if (!response.ok) throw new Error(`Public listing HTTP ${response.status}; page ${page}`);
    const {result} = await response.json();
    if (!Array.isArray(result?.scripts)) throw new Error('Unexpected public listing');
    for (const item of result.scripts) {
      const id = `games_sb_${item._id}`;
      if (!/^[a-f0-9]{24}$/.test(item._id) || typeof item.slug !== 'string' || !/^[\w().%-]+$/.test(item.slug)) continue;
      const source = 'https://scriptblox.com/script/' + item.slug;
      if (ids.has(id) || sources.has(source) || item.isPatched || item.scriptType !== 'free') continue;
      if (!item.title || !item.game?.name || /steal|token.?log|cookie.?log|account.?hack|beam|phish|grabber|dupe.?robux|free.?robux/i.test(item.title)) continue;
      catalog.push({id, name:item.title.slice(0,180), description:`${item.game.name}. Publicación de la comunidad en ScriptBlox. ${item.key?'Requiere clave':'Sin clave indicada'} según la fuente. Contenido remoto y funcionamiento sin verificar.`,
        level:'free', device:'unknown', platform:'roblox', type:'loadstring', executors:['Ejecutor externo (sin verificar)'], tags:['Juegos','Comunidad',item.key?'Con clave':'Sin clave'], version:'1.0', created_at:date,
        code:`loadstring(game:HttpGet(${JSON.stringify('https://scriptblox.com/raw/'+item.slug)}))()`, game:item.game.name.slice(0,180), game_id:String(item.game.gameId || 0), catalog_section:'games',
        compatibility:{environment:'client',runtime:'Roblox · ejecutor externo',context:'Cliente de Roblox; publicación externa de la comunidad.',requirements:'API loadstring y game:HttpGet. Revisar el contenido en la fuente antes de ejecutarlo.',verification:'unverified',test_details:`Ficha encontrada en el listado público el ${date}. No se descargó, auditó ni ejecutó el código remoto.`,mobile_status:'PC, Android e iOS sin comprobar.',executor_status:'unverified',sources:[source],checked_at:date}});
      ids.add(id); sources.add(source); added++;
      if (added >= target) break;
    }
    if (page % 20 === 0) console.log(`Public listing: ${page} pages; ${added} new entries`);
    if (!result.nextPage || page >= result.totalPages) break;
    await new Promise(resolve=>setTimeout(resolve,120));
  }
  fs.writeFileSync('scripts.json',JSON.stringify(catalog,null,2)+'\n');
  console.log(`Imported ${added} unique public listings; catalog: ${catalog.length}`);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
