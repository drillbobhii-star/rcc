/* Editorial forecast from catalog content, never persisted as visitor activity. */
(() => {
  const cache=new WeakMap();
  function analyze(script){
    if(cache.has(script))return cache.get(script);
    const text=[script.name,script.description,...(script.tags||[])].join(' ').toLowerCase();
    const code=script.code||'';
    let score=12;
    const reasons=[];
    if(script.device==='both'){score+=18;reasons.push('Disponible para móvil y PC');}
    if(/universal|anti.?afk|fps boost|server hop|infinite yield|blox fruits|grow a garden/.test(text)){score+=26;reasons.push('Utilidad amplia o juego destacado');}
    if(/buscador|menú|menu|inventario|inventory|guardado|checkpoint|notifica|panel|interfaz|contador/.test(text)){score+=20;reasons.push('Función reutilizable en otros proyectos');}
    if(script.type==='source'&&code.length>=120){score+=14;reasons.push('Código fuente disponible para adaptar');}
    if(['lua-tested','js-syntax','syntax-only'].includes(script.compatibility?.verification)){score+=12;reasons.push('Cuenta con revisión técnica indicada en su ficha');}
    if(script.catalog_section==='web'){score+=9;reasons.push('Ejemplo web sin instalación de paquetes');}
    if((script.executors||[]).length>=3)score+=7;
    if(/config|settings|opciones|personaliza/.test(text+' '+code.slice(0,1500).toLowerCase()))score+=8;
    const copies=score*score*7+score*83;
    const downloads=Math.round(copies*(script.type==='source'?0.32:0.16));
    const result={score,copies,downloads,reason:reasons.slice(0,2).join(' · ')||'Ejemplo de uso directo del catálogo'};
    cache.set(script,result);return result;
  }
  function rank(scripts,counts){
    const ranked=scripts.map(script=>{
      const forecast=analyze(script);
      const activity=counts[script.id]?.total||0;
      return {script,score:forecast.score+Math.log2(1+activity)*10};
    }).sort((a,b)=>b.score-a.score||a.script.id.localeCompare(b.script.id,'es'));
    const families=new Map();
    const games=new Map();
    function pick(entries,limit){
      const result=[];
      for(const {script} of entries){
        if(result.length>=limit)break;
        const family=script.name.split(' · ')[0].toLowerCase();
        const game=script.catalog_section==='games'?(script.game_id&&script.game_id!=='0'?script.game_id:script.game||'universal'):null;
        if((families.get(family)||0)>=2||(game&&(games.get(game)||0)>=2))continue;
        families.set(family,(families.get(family)||0)+1);
        if(game)games.set(game,(games.get(game)||0)+1);
        result.push(script);
      }
      return result;
    }
    const gameEntries=pick(ranked.filter(({script})=>script.catalog_section==='games'),30);
    const codeEntries=pick(ranked.filter(({script})=>script.catalog_section!=='games'),30);
    const result=[];
    // Alternate so both categories appear on the first page and on mobile.
    for(let i=0;i<Math.max(gameEntries.length,codeEntries.length);i++){
      if(gameEntries[i])result.push(gameEntries[i]);
      if(codeEntries[i])result.push(codeEntries[i]);
    }
    const selected=new Set(result.map(script=>script.id));
    const extra=pick(ranked.filter(({script})=>!selected.has(script.id)),60-result.length);
    result.push(...extra);
    extra.forEach(script=>selected.add(script.id));
    for(const {script} of ranked){
      if(!selected.has(script.id)&&(counts[script.id]?.total||0)>0){result.push(script);selected.add(script.id);}
    }
    return result;
  }

  window.RCCTrendAnalysis={analyze,rank};
})();
