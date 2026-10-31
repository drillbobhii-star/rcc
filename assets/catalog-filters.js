/* Shared, side-effect-free matching rules for the catalog and regression tests. */
(() => {
  const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
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
    const haystack=normalize([script.name,script.description,script.game,script.platform,script.compatibility?.runtime,script.compatibility?.context,...(script.tags||[]),...(script.executors||[])].join(' '));
    return normalize(filters.query).trim().split(/\s+/).every(word=>haystack.includes(word));
  }
  window.RCCCatalogFilters={matches,normalize};
})();
