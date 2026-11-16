(() => {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    #rccCommunityFeed{margin:18px 0 24px;padding:18px;border:1px solid var(--border-glass);border-radius:20px;background:var(--card-glass);backdrop-filter:blur(18px)}
    #rccCommunityFeed[hidden]{display:none}
    .rcc-feed-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
    .rcc-feed-head h3{font-size:clamp(1.1rem,2.5vw,1.45rem);margin:0}
    .rcc-feed-meta{font-size:.78rem;color:var(--muted);margin-top:5px}
    .rcc-feed-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:11px}
    .rcc-feed-card{min-width:0;padding:14px;border:1px solid var(--border-glass);border-radius:15px;background:var(--bg-glass);display:flex;flex-direction:column;gap:8px;transition:transform .18s,border-color .18s}
    .rcc-feed-card:hover{transform:translateY(-2px);border-color:var(--border-hover)}
    .rcc-feed-card h4{font-size:.98rem;line-height:1.35;overflow-wrap:anywhere}
    .rcc-feed-card p{font-size:.83rem;color:var(--muted);line-height:1.45}
    .rcc-feed-tags{display:flex;gap:6px;flex-wrap:wrap}
    .rcc-feed-tag{font-size:.68rem;padding:4px 7px;border:1px solid var(--border-glass);border-radius:99px;color:var(--muted)}
    .rcc-feed-link{display:inline-flex;align-items:center;justify-content:center;margin-top:auto;padding:9px 12px;border:1px solid var(--border-glass);border-radius:10px;color:var(--text);text-decoration:none;font-weight:700;font-size:.82rem}
    .rcc-feed-link:hover{background:var(--theme-color)}
    .rcc-feed-note{font-size:.75rem;color:var(--muted);margin-top:12px}
    @media(max-width:560px){#rccCommunityFeed{padding:13px}.rcc-feed-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
  const grid = document.getElementById('scripts');
  if (!grid || document.getElementById('rccCommunityFeed')) return;
  const section = document.createElement('section');
  section.id = 'rccCommunityFeed';
  section.hidden = true;
  section.setAttribute('aria-label', 'Descubrimientos recientes y tendencias externas');
  section.innerHTML = '<div class="rcc-feed-head"><div><h3 id="rccFeedTitle">Descubrimientos de la comunidad</h3><p class="rcc-feed-meta" id="rccFeedMeta">Consultando fuentes externas…</p></div><span class="rcc-feed-tag">ACTUALIZACIÓN AUTOMÁTICA</span></div><div class="rcc-feed-grid" id="rccFeedCards"></div><p class="rcc-feed-note" id="rccFeedNote">Los enlaces abren la publicación original. RCC no aloja ni ejecuta scripts de terceros.</p>';
  grid.before(section);
  const cards = section.querySelector('#rccFeedCards');
  const title = section.querySelector('#rccFeedTitle');
  const meta = section.querySelector('#rccFeedMeta');
  const note = section.querySelector('#rccFeedNote');
  let feed = null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date = value => { const parsed = value ? new Date(value) : null; return parsed && Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('es-DO',{dateStyle:'medium'}).format(parsed) : 'Fecha no disponible'; };
  function render(mode) {
    if (!feed) {
      title.textContent = 'Fuentes de la comunidad';
      meta.textContent = 'La primera sincronización automática está pendiente.';
      cards.innerHTML = '<p class="rcc-feed-note">Vuelve a consultar esta sección cuando termine la primera actualización del catálogo.</p>';
      section.hidden = false; return;
    }
    const items = mode === 'trending' ? feed.trending : feed.newest;\n    const newsItems = mode === 'updates' && Array.isArray(feed.news) ? feed.news : [];
    title.textContent = mode === 'trending' ? '🔥 Tendencias de la comunidad' : '🆕 Scripts recién publicados';
    const sources = Object.entries(feed.sources || {}).filter(([, value]) => value.ok).map(([name]) => name);
    meta.textContent = new Intl.NumberFormat('es-DO').format(items.length) + ' descubrimientos · Actualizado ' + date(feed.updatedAt) + (sources.length ? ' · Fuentes: ' + sources.join(', ') : '');
    cards.replaceChildren();
    for (const item of [...newsItems, ...items].slice(0, 72)) {
      const card = document.createElement('article'); card.className = 'rcc-feed-card';
      const heading = document.createElement('h4'); heading.textContent = item.title || 'Script sin título';
      const description = document.createElement('p'); description.textContent = (item.game || 'Roblox') + ' · ' + (item.creator || 'Comunidad');
      const details = document.createElement('p'); details.textContent = (item.views ? new Intl.NumberFormat('es-DO',{notation:'compact'}).format(item.views) + ' vistas · ' : '') + date(item.createdAt);
      const tags = document.createElement('div'); tags.className = 'rcc-feed-tags';
      const tag = (value) => { const span=document.createElement('span');span.className='rcc-feed-tag';span.textContent=value;tags.append(span); };
      tag(item.source || 'Fuente externa'); if(item.kind !== 'news') tag(item.verified ? 'Creador verificado' : 'No verificado por la fuente');
      if (item.keyRequired) tag('Requiere clave');
      if (item.riskLevel) tag('Riesgo: ' + item.riskLevel);
      if (item.obfuscated) tag('Ofuscado');
      const link = document.createElement('a'); link.className='rcc-feed-link';\n      let destination = ''; try { const parsed = new URL(item.url); if (parsed.protocol === 'https:' && ['scriptblox.com','rscripts.net','www.r-scripts.net'].includes(parsed.hostname)) destination = parsed.href; } catch (_) {}\n      if (!destination) continue;\n      link.href=destination; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent=item.kind === 'news' ? 'Leer novedades ↗' : 'Ver publicación original ↗';
      card.append(heading,description,details,tags,link); cards.append(card);
    }
    note.textContent = feed.notice || 'Metadatos y enlaces originales; RCC no aloja ni ejecuta scripts de terceros.';
    section.hidden = false;
  }
  async function load() {
    try {
      const response = await fetch('/community-feed.json?ts=' + Date.now(), {cache:'no-store', signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('Feed no disponible');
      const data = await response.json();
      if (data.schema !== 'rcc-community-feed-v1' || !Array.isArray(data.newest) || !Array.isArray(data.trending)) throw new Error('Formato de feed no válido');
      feed = data;
      const banner = document.querySelector('#catalogNews p');
      if (banner) banner.textContent = 'RCC amplía su biblioteca y consulta nuevas publicaciones y tendencias de fuentes externas. Las fichas muestran su fuente original, fecha y estado de verificación.';
      const count = feed.counts?.newest || feed.newest.length;
      const tabs = document.getElementById('updatesTab');
      if (tabs) tabs.textContent = 'Novedades · ' + new Intl.NumberFormat('es-DO').format(count);
      const trending = document.getElementById('trendingTab');
      if (trending) trending.textContent = 'Tendencia · ' + new Intl.NumberFormat('es-DO').format(feed.trending.length);
    } catch (error) {
      console.warn('[RCC community feed]', error);
      feed = null;
    }
  }
  const nav = window.RCCNavigation;
  const show = mode => { nav?.section('all',{view:mode}); render(mode); };
  document.getElementById('trendingTab')?.addEventListener('click', () => show('trending'));
  document.getElementById('updatesTab')?.addEventListener('click', () => show('updates'));
  for (const [id,sectionName] of [['libraryTab','all'],['gamesTab','games'],['webTab','web'],['vipTab','vip']]) {
    document.getElementById(id)?.addEventListener('click', () => { section.hidden=true; nav?.section(sectionName); });
  }
  void load();
})();