/* Shared, side-effect-free matching rules for the catalog and regression tests. */
(() => {
  const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const stopWords = new Set('quiero necesito busco buscar busca dame muestra mostrar un una unos unas el la los las de del para por con en y que me puedes codigo codigos script scripts como hacer crear usar utilizar ejecutor ejecutores'.split(' '));
  const groups = [
    ['inventario','inventory'], ['boton','botones','button','buttons'], ['moneda','monedas','coins','coin'],
    ['tienda','shop'], ['salud','vida','health'], ['velocidad','speed'], ['animacion','animaciones','animation','animations'],
    ['interfaz','interface','ui'], ['teletransporte','teleport'], ['celular','movil','mobile'], ['computadora','pc'],
    ['llave','llaves','key'], ['personaje','character']
  ];
  let lastQuery, lastTokens;
  function tokens(query) {
    const raw=normalize(query).slice(0,200);
    if(raw===lastQuery)return lastTokens;
    const key=raw.replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const words=key.split(/\s+/).filter(Boolean);
    if(!words.length&&raw.trim())words.push(raw.trim());
    const meaningful=words.filter(word=>!stopWords.has(word));
    lastQuery=raw;lastTokens=(meaningful.length?meaningful:words).map(word=>groups.find(group=>group.includes(word))||[word]);
    return lastTokens;
  }
  const cache=new WeakMap();
  function searchable(script) {
    if(!cache.has(script))cache.set(script,normalize([script.name,script.description,script.game,script.platform,script.type,script.device,script.device==='both'?'pc mobile':'',script.compatibility?.runtime,script.compatibility?.context,...(script.tags||[]),...(script.executors||[])].join(' ')).replace(/[^\p{L}\p{N}]+/gu,' '));
    return cache.get(script);
  }
  function textMatches(text,query) {return tokens(query).every(group=>group.some(word=>text.includes(word)));}
  function matches(script,filters={}){
    const any=value=>!value||value==='all';
    const device=filters.device;
    if(!any(device)&&script.device!==device&&!(script.device==='both'&&['pc','mobile'].includes(device)))return false;
    if(!any(filters.platform)&&script.platform!==filters.platform)return false;
    if(!any(filters.executor)&&!(script.executors||[]).includes(filters.executor))return false;
    if(!any(filters.type)&&script.type!==filters.type)return false;
    if(filters.tag&&!(script.tags||[]).includes(filters.tag))return false;
    if(!any(filters.environment)&&(script.compatibility?.environment||'legacy')!==filters.environment)return false;
    if(!any(filters.verification)&&(script.compatibility?.verification||'unverified')!==filters.verification)return false;
    return textMatches(searchable(script),filters.query);
  }
  window.RCCCatalogFilters={matches,normalize,tokens,searchable,textMatches};
})();
