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
    .rcc-feed-tag--patched{border-color:#c45d4b;background:#8d2f241c;color:#e78b79;font-weight:800}
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
    const items = mode === 'trending' ? feed.trending : feed.newest;
    const newsItems = mode === 'updates' && Array.isArray(feed.news) ? feed.news : [];
    title.textContent = mode === 'trending' ? '🔥 Tendencias de la comunidad' : '🆕 Scripts recién publicados';
    const sources = Object.entries(feed.sources || {}).filter(([, value]) => value.ok).map(([name]) => name);
    meta.textContent = new Intl.NumberFormat('es-DO').format(items.length) + ' descubrimientos · Actualizado ' + date(feed.updatedAt) + (sources.length ? ' · Fuentes: ' + sources.join(', ') : '');
    cards.replaceChildren();
    for (const item of [...newsItems, ...items].slice(0, 72)) {
      const card = document.createElement('article'); card.className = 'rcc-feed-card';
      const heading = document.createElement('h4'); heading.textContent = item.title || 'Script sin título';
      const description = document.createElement('p'); description.textContent = (item.game || item.language || 'Código') + ' · ' + (item.creator || 'Comunidad');
      const details = document.createElement('p'); details.textContent = (item.views ? new Intl.NumberFormat('es-DO',{notation:'compact'}).format(item.views) + ' vistas · ' : '') + date(item.createdAt);
      const tags = document.createElement('div'); tags.className = 'rcc-feed-tags';
      const tag = (value, extraClass = '') => { const span=document.createElement('span');span.className='rcc-feed-tag'+(extraClass?' '+extraClass:'');span.textContent=value;tags.append(span); };
      tag(item.source || 'Fuente externa'); if(item.kind !== 'news') tag(item.verified ? 'Creador verificado' : 'No verificado por la fuente');
      if (item.patched === true) tag('⚠️ PARCHEADO','rcc-feed-tag--patched');
      if (item.keyRequired) tag('Requiere clave');
      if (item.riskLevel) tag('Riesgo: ' + item.riskLevel);
      if (item.obfuscated) tag('Ofuscado');
      const link = document.createElement('a'); link.className='rcc-feed-link';
      let destination = ''; try { const parsed = new URL(item.url); if (parsed.protocol === 'https:' && ['scriptblox.com','rscripts.net','www.r-scripts.net','github.com','forum.cfx.re','docs.fivem.net','dev.java','docs.oracle.com','create.roblox.com','docs.python.org'].includes(parsed.hostname)) destination = parsed.href; } catch (_) {}
      if (!destination) continue;
      link.href=destination; link.target='_blank'; link.rel='noopener noreferrer'; link.textContent=item.kind === 'news' ? 'Leer novedades ↗' : item.kind === 'repository' ? 'Ver repositorio ↗' : 'Ver publicación original ↗';
      if (item.patched === true) { link.dataset.patched = 'true'; link.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); showPatchedWarning(item.title, () => window.open(destination, '_blank', 'noopener,noreferrer')); }); }
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
  if (document.getElementById('trendingTab')) document.getElementById('trendingTab').onclick = () => show('trending');
  if (document.getElementById('updatesTab')) document.getElementById('updatesTab').onclick = () => show('updates');
  for (const [id,sectionName] of [['libraryTab','all'],['gamesTab','games'],['webTab','web'],['vipTab','vip']]) {
    if (document.getElementById(id)) document.getElementById(id).onclick = () => { section.hidden=true; nav?.section(sectionName); };
  }

  function showPatchedWarning(name, onContinue) {
    const dialog = document.createElement('dialog');
    dialog.className = 'patched-confirm';
    dialog.setAttribute('aria-labelledby', 'rccPatchedTitle');
    const heading = document.createElement('h3');
    heading.id = 'rccPatchedTitle';
    heading.textContent = '⚠️ Script parcheado';
    const message = document.createElement('p');
    message.textContent = (name ? name + ': ' : '') + 'Este código está parcheado en Roblox. Si lo ejecuta, es bajo su propia responsabilidad. Puede que ya no funcione correctamente.';
    const actions = document.createElement('div');
    actions.className = 'patched-confirm-actions';
    const no = document.createElement('button');
    no.type = 'button'; no.className = 'btn btn-ghost'; no.textContent = 'No, volver';
    const yes = document.createElement('button');
    yes.type = 'button'; yes.className = 'btn btn-primary'; yes.textContent = 'Sí, continuar';
    const close = () => { if (dialog.open) dialog.close(); dialog.remove(); };
    no.onclick = close;
    yes.onclick = () => { close(); onContinue?.(); };
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    actions.append(no, yes); dialog.append(heading, message, actions);
    document.body.append(dialog); dialog.showModal(); no.focus();
  }
  const originalOpenScript = window.openScript;
  if (typeof originalOpenScript === 'function') {
    window.openScript = function(script, ...args) {
      if (script?.review?.status === 'patched') {
        showPatchedWarning(script.name, () => originalOpenScript.call(this, script, ...args));
        return;
      }
      return originalOpenScript.call(this, script, ...args);
    };
  }
  if (window.RCCScriptReview?.confirm) {
    window.RCCScriptReview.confirm = (script, action) => {
      if (script?.review?.status !== 'patched') return false;
      showPatchedWarning(script.name, action);
      return true;
    };
  }
  void load();
})();