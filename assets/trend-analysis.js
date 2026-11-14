/* RCC editorial trends: deterministic popularity estimates, never real download analytics. */
(() => {
  const cache=new WeakMap();

  function seedOf(value){
    let hash=2166136261;
    for(const char of String(value||'')){
      hash^=char.charCodeAt(0);
      hash=Math.imul(hash,16777619);
    }
    return hash>>>0;
  }

  function analyze(script){
    if(!script||typeof script!=='object')return {score:0,copies:0,downloads:0,reason:'Ficha no disponible'};
    if(cache.has(script))return cache.get(script);

    const name=String(script.name||'');
    const description=String(script.description||'');
    const tags=Array.isArray(script.tags)?script.tags.join(' '):'';
    const text=`${name} ${description} ${tags}`.toLowerCase();
    const code=String(script.code||'').toLowerCase();
    let score=18;
    const reasons=[];

    // Broad usefulness signals: games, utilities, interfaces and web snippets.
    const popular=[
      [/universal|multi.?game|cross.?game|universal hub/,20,'Uso amplio en distintos juegos'],
      [/anti.?afk|afk|auto.?farm|autofarm|farm/,18,'Automatización de tareas repetitivas'],
      [/fps|optimizer|boost|performance|optimiza|rendimiento/,15,'Mejoras y optimización'],
      [/teleport|server.?hop|hop server|teletrans|travel/,14,'Herramientas de navegación'],
      [/admin|command|comando|console|executor/,13,'Funciones de control y comandos'],
      [/blox fruits|grow a garden|brookhaven|murder mystery|doors|arsenal|pet simulator/,16,'Relacionado con juegos conocidos'],
      [/gui|interface|interfaz|menu|menú|dashboard|panel|hub/,13,'Interfaz y panel de herramientas'],
      [/inventory|inventario|shop|tienda|trade|trading/,11,'Sistemas de inventario o comercio'],
      [/html|css|javascript|typescript|react|web|api|json/,12,'Código web reutilizable'],
      [/discord|bot|webhook|notification|notificacion|notificación/,10,'Integraciones y notificaciones'],
      [/save|guardado|data.?store|database|base de datos|checkpoint/,10,'Guardado y gestión de datos'],
      [/camera|cámara|movement|movimiento|vehicle|vehículo/,8,'Controles y mecánicas de juego']
    ];
    for(const [pattern,points,reason] of popular){
      if(pattern.test(text)){score+=points;reasons.push(reason);}
    }

    if(script.device==='both'){score+=10;reasons.push('Compatible con móvil y PC');}
    else if(script.device==='mobile'||script.device==='pc')score+=3;
    if(script.type==='source'&&code.length>=120){score+=9;reasons.push('Código fuente disponible para adaptar');}
    if(['lua-tested','js-syntax','syntax-only'].includes(script.compatibility?.verification)){
      score+=8;reasons.push('Tiene una revisión técnica indicada');
    }
    if(script.catalog_section==='web')score+=5;
    if((Array.isArray(script.executors)?script.executors.length:0)>=3)score+=5;
    if(/config|settings|opciones|personaliza|customiz/.test(text+' '+code.slice(0,2500)))score+=5;
    if(code.length>500)score+=Math.min(8,Math.floor(code.length/500));
    if(/readme|example|ejemplo|tutorial|starter|plantilla/.test(text))score+=3;

    // Small stable variation makes the estimates look varied without changing on each render.
    const seed=seedOf(script.id||name);
    const randomA=(seed%10000)/10000;
    const randomB=((Math.imul(seed,48271)>>>0)%10000)/10000;
    const normalized=Math.max(0,Math.min(100,score));
    const copies=Math.round((1800+normalized*2450)*(0.72+randomA*0.62));
    const downloads=Math.round(copies*(0.18+randomB*0.3));
    const result={
      score:normalized,
      copies,
      downloads,
      reason:reasons.slice(0,2).join(' · ')||'Código útil del catálogo con popularidad editorial estimada'
    };
    cache.set(script,result);
    return result;
  }

  function rank(scripts,counts={}){
    const ranked=(Array.isArray(scripts)?scripts:[]).map(script=>{
      const forecast=analyze(script);
      const activity=Number(counts?.[script.id]?.total)||0;
      return {script,score:forecast.score+Math.log2(1+Math.max(0,activity))*10};
    }).sort((a,b)=>b.score-a.score||String(a.script.id).localeCompare(String(b.script.id),'es'));

    const families=new Map();
    const games=new Map();
    function pick(entries,limit){
      const result=[];
      for(const {script} of entries){
        if(result.length>=limit)break;
        const family=String(script.name||script.id).split(' · ')[0].toLowerCase();
        const game=script.catalog_section==='games'
          ?(script.game_id&&script.game_id!=='0'?script.game_id:script.game||'universal')
          :null;
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
    // Alternate game scripts and general-purpose code so both appear immediately.
    for(let i=0;i<Math.max(gameEntries.length,codeEntries.length);i++){
      if(gameEntries[i])result.push(gameEntries[i]);
      if(codeEntries[i])result.push(codeEntries[i]);
    }
    const selected=new Set(result.map(script=>script.id));
    const extra=pick(ranked.filter(({script})=>!selected.has(script.id)),60-result.length);
    result.push(...extra);
    for(const {script} of ranked){
      if(!selected.has(script.id)&&(Number(counts?.[script.id]?.total)||0)>0){
        result.push(script);
        selected.add(script.id);
      }
    }
    return result;
  }

  window.RCCTrendAnalysis={analyze,rank};
})();
