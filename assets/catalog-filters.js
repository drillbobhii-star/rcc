/* Shared filtering rules; all constraints are explicit, including section and device. */
(() => {
  const normalize = value => String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function matches(s, f) {
    if(f.section !== 'all' && s.catalog_section !== f.section) return false;
    if(f.platform !== 'all' && s.platform !== f.platform) return false;
    if(f.device !== 'all' && s.device !== f.device && !(s.device === 'both' && ['pc','mobile','both'].includes(f.device))) return false;
    if(f.executor !== 'all' && !(s.executors || []).includes(f.executor)) return false;
    if(f.type !== 'all' && s.type !== f.type) return false;
    if(f.tag && !(s.tags || []).includes(f.tag)) return false;
    if(f.environment !== 'all' && (s.compatibility?.environment || 'legacy') !== f.environment) return false;
    if(f.verification !== 'all' && (s.compatibility?.verification || 'unverified') !== f.verification) return false;
    if(f.section === 'games') {
      if(f.game !== 'all' && s.game !== f.game) return false;
      if(f.origin !== 'all' && (s.tags || []).includes('Original RCC') !== (f.origin === 'original')) return false;
    }
    if(f.query) {
      const haystack=normalize([s.name,s.description,s.game,s.platform,s.compatibility?.runtime,s.compatibility?.context,...(s.tags||[]),...(s.executors||[])].join(' '));
      if(!normalize(f.query).trim().split(/\s+/).every(word=>haystack.includes(word))) return false;
    }
    return true;
  }
  globalThis.RCCFilters = { matches };
})();
