/* A catalog index, not a code generator. All suggestions originate in published metadata. */
(() => {
  const filters=window.RCCCatalogFilters;
  const normalize=text=>filters.normalize(text).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  function distance(a,b) {
    if(Math.abs(a.length-b.length)>2)return 3;
    const d=Array.from({length:a.length+1},()=>new Uint8Array(b.length+1));
    for(let i=0;i<=a.length;i++)d[i][0]=i;
    for(let j=0;j<=b.length;j++)d[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1);
    }
    return d[a.length][b.length];
  }
  function createIndex(scripts) {
    const entries=new Map();
    const add=(label,kind,script)=>{
      if(typeof label!=='string'||!label.trim())return;
      const key=kind+':'+normalize(label);
      let entry=entries.get(key);
      if(!entry){entry={label:label.trim(),query:label.trim(),kind,count:0,title:normalize(label),haystack:kind==='Código'?filters.searchable(script):normalize(label)};entries.set(key,entry);}
      entry.count++;
    };
    scripts.forEach(script=>{
      add(script.name,'Código',script);add(script.game,'Juego');add(script.platform,'Plataforma');
      (script.executors||[]).forEach(value=>add(value,'Ejecutor'));
      (script.tags||[]).forEach(value=>add(value,'Etiqueta'));
    });
    const all=[...entries.values()];
    const facets=all.filter(entry=>entry.kind!=='Código');
    const toResult=(entry,correction=false)=>({label:entry.label,query:entry.query,kind:entry.kind,count:entry.count,correction});
    function suggest(query,limit=10) {
      limit=Math.min(20,Math.max(1,limit));
      const text=normalize(query).slice(0,200);
      if(!text&&String(query||'').trim())return [];
      if(!text)return facets.filter(entry=>entry.kind==='Ejecutor'||entry.kind==='Juego').sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'es')).slice(0,limit).map(entry=>toResult(entry));
      const rank=entry=>(entry.title===text?1000:entry.title.startsWith(text)?700:entry.title.includes(text)?500:filters.textMatches(entry.title,text)?400:100)+(entry.kind==='Código'?0:30)+Math.min(15,Math.log2(entry.count+1));
      const matches=all.filter(entry=>filters.textMatches(entry.haystack,text));
      if(matches.length)return matches.sort((a,b)=>rank(b)-rank(a)||a.label.localeCompare(b.label,'es')).slice(0,limit).map(entry=>toResult(entry));
      if(text.length<3||text.length>48)return [];
      return all.filter(entry=>entry.title.length<=48&&Math.abs(entry.title.length-text.length)<=2)
        .map(entry=>({entry,distance:distance(text,entry.title)})).filter(item=>item.distance<=(text.length<5?1:2))
        .sort((a,b)=>a.distance-b.distance||b.entry.count-a.entry.count).slice(0,Math.min(5,limit)).map(item=>toResult(item.entry,true));
    }
    function recommend(query='') {
      const candidates=scripts.filter(script=>!query?script.catalog_section==='web':filters.matches(script,{query}));
      const groups=new Set();const selected=[];
      // Diversify the first choices instead of showing four adjacent variants.
      for(const script of candidates){
        const group=script.game||script.type||script.platform;
        if(groups.has(group))continue;
        groups.add(group);selected.push(script);if(selected.length===4)break;
      }
      for(const script of candidates){if(selected.length===4)break;if(!selected.includes(script))selected.push(script);}
      return selected.map(script=>({name:script.name,query:script.name,section:script.catalog_section==='games'?'games':script.catalog_section==='web'?'web':'all'}));
    }
    return {suggest,recommend,executors:facets.filter(entry=>entry.kind==='Ejecutor').sort((a,b)=>a.label.localeCompare(b.label,'es')).map(entry=>({name:entry.label,count:entry.count}))};
  }
  window.RCCCatalogSearch={createIndex};
})();
