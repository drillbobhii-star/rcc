/* Navigation and a deterministic library helper. No generated code or AI responses. */
(() => {
  const $ = id => document.getElementById(id);
  document.body.classList.add('studio-layout');
  const nav = document.createElement('nav');
  nav.className = 'studio-dock';
  nav.setAttribute('aria-label', 'Panel principal');
  nav.innerHTML = `<div class="dock-brand"></div><div class="dock-links"><button type="button" data-panel="explore">Explorar <span>01</span></button><button type="button" data-panel="appearance">Personalizar <span>02</span></button><button type="button" data-panel="tools">Herramientas <span>03</span></button><button type="button" id="dockAssistant">Asistente <span>04</span></button></div><div class="dock-language"></div>`;
  document.body.prepend(nav);
  nav.querySelector('.dock-brand').append($('logoHome'));
  nav.querySelector('.dock-language').append(document.querySelector('.language-picker'));
  const panel = document.createElement('dialog');
  panel.id = 'studioPanel'; panel.className = 'studio-panel';
  panel.setAttribute('aria-labelledby', 'studioPanelTitle');
  panel.innerHTML = `<div class="studio-panel-head"><div><span class="eyebrow" id="studioPanelKicker">RCC / ESPACIOS</span><h2 id="studioPanelTitle" tabindex="-1">Explorar</h2></div><form method="dialog"><button class="studio-panel-close" aria-label="Cerrar panel">×</button></form></div><div id="spaceExplore" class="studio-space"></div><div id="spaceAppearance" class="studio-space" hidden></div><div id="spaceTools" class="studio-space" hidden><div class="tools-launch"><span class="eyebrow">LEE / COMPARA / TRANSFORMA</span><h3>Tu código, bajo la lupa.</h3><p>Lee qué hace un script, compara dos versiones o prepara una copia ofuscada de Lua/Luau. Conserva siempre el original.</p><a href="#analysis" data-lab-link>Analizar código ↗</a><a href="#obfuscator" data-lab-link>Ofuscar Lua/Luau ↗</a><a href="compatibilidad.html">Consultar compatibilidad ↗</a><a href="soporte.html">Ayuda y reportes ↗</a></div></div>`;
  document.body.append(panel);
  $('spaceExplore').append($('sidebar'));
  $('spaceAppearance').append($('personalization'));
  $('spaceTools').append($('codeCompare'));
  $('personalization').open = true;
  $('codeCompare').open = true;
  const titles = {explore:['Explora a tu manera.', '01 / BIBLIOTECA'], appearance:['Tu espacio. Tus reglas.', '02 / ESTUDIO VISUAL'], tools:['De la idea al proyecto.', '03 / HERRAMIENTAS']};
  let panelReturn = null;
  function openPanel(name) {
    if (!titles[name]) return;
    panelReturn = document.activeElement;
    for (const [key,id] of [['explore','spaceExplore'],['appearance','spaceAppearance'],['tools','spaceTools']]) $(id).hidden = key !== name;
    $('studioPanelTitle').textContent = titles[name][0]; $('studioPanelKicker').textContent = titles[name][1];
    nav.querySelectorAll('[data-panel]').forEach(button => button.setAttribute('aria-expanded', String(button.dataset.panel === name)));
    if (!panel.open) panel.showModal();
    document.body.classList.add('studio-panel-open');
    panel.scrollTop = 0; $('studioPanelTitle').focus({preventScroll:true});
  }
  nav.querySelectorAll('[data-panel]').forEach(button => {
    button.setAttribute('aria-controls','studioPanel'); button.setAttribute('aria-expanded','false');
    button.onclick = () => openPanel(button.dataset.panel);
  });
  panel.addEventListener('close', () => {
    document.body.classList.remove('studio-panel-open');
    nav.querySelectorAll('[data-panel]').forEach(button => button.setAttribute('aria-expanded','false'));
    panelReturn?.focus({preventScroll:true});
  });
  panel.addEventListener('click', event => { if (event.target.closest('[data-lab-link]')) panel.close(); });
  $('hamburger').textContent = 'Filtros';
  $('hamburger').setAttribute('aria-label', 'Abrir explorador de filtros');
  $('hamburger').setAttribute('aria-controls', 'studioPanel');
  $('hamburger').onclick = () => openPanel('explore');
  $('appearanceToggle').addEventListener('click', event => {event.stopImmediatePropagation();openPanel('appearance');}, true);
  ['gamesNav','webNav','favoritesBtn','recentBtn'].forEach(id => $(id).addEventListener('click', () => panel.close()));
  // Desktop and mobile use the same permanent top navigation.
  $('overlay').hidden = true;

  const guide = window.RCCAssistantGuide;
  const guideLogo = '<svg class="assistant-logo" viewBox="0 0 48 48" aria-hidden="true"><circle class="guide-orbit" cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-dasharray="65 67"/><rect x="10" y="13" width="28" height="24" rx="10" fill="none" stroke="currentColor" stroke-width="2"/><g class="guide-eyes"><circle cx="19" cy="24" r="2" fill="currentColor"/><circle cx="29" cy="24" r="2" fill="currentColor"/></g><path d="M20 30h8M24 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const assistant = document.createElement('section');
  assistant.id = 'libraryAssistant'; assistant.className = 'library-assistant'; assistant.hidden = true;
  assistant.setAttribute('role','region'); assistant.setAttribute('aria-labelledby','assistantTitle');
  assistant.innerHTML = `<div class="assistant-head"><span class="assistant-mark" aria-hidden="true">${guideLogo}</span><div><h2 id="assistantTitle">Tu guía RCC</h2><small>ASISTENTE DE BIBLIOTECA · SIN IA</small></div><button type="button" id="assistantClose" aria-label="Cerrar asistente">×</button></div><div class="assistant-body"><p id="assistantReply" role="status" aria-live="polite">Te ayudo a encontrar código y a recorrer RCC. Elige una acción o escribe qué quieres buscar.</p><div id="assistantRecommendations"></div><section class="assistant-discovery" aria-label="Preguntas sugeridas"><div class="assistant-discovery-head"><strong>¿Qué exploramos?</strong><button type="button" id="assistantShuffle">Otras preguntas ↻</button></div><label for="assistantTopic">Tema de las sugerencias</label><select id="assistantTopic"><option value="all">Todos los temas</option><option value="catalog">Catálogo</option><option value="updates">Actualización</option><option value="safety">Advertencias</option><option value="navigation">Funciones de RCC</option></select><div id="assistantQuestions"></div><small id="assistantQuestionCount"></small></section><div class="assistant-actions"><button data-assist="executors" data-open-executors>Panel de ejecutores</button><button data-assist="requirements">loadstring / HttpGet</button><button data-assist="downloads">Ayuda de descarga</button><button data-assist="safety">Advertencias</button><button data-assist="release">Qué cambió</button><button data-assist="search">Buscar código</button><button data-assist="recommend">Recomiéndame algo</button><button data-assist="games">Juegos Roblox</button><button data-assist="web">JavaScript / Web</button><button data-assist="filters">Filtros y plataformas</button><button data-assist="appearance">Cambiar mi estilo</button><button data-assist="tools">Herramientas</button><button data-assist="recent">Mis recientes</button><button data-assist="favorites">Favoritos</button><button data-assist="trending">Tendencias</button><button data-assist="updates">Novedades</button><button data-assist="motion">Ejemplos animados</button><button data-assist="compatibility">Compatibilidad</button><button data-assist="guide">Ver presentación</button><button data-assist="clear">Limpiar filtros</button><button data-assist="top">Volver arriba</button><button data-assist="help">Ayuda</button></div><form id="assistantForm"><label for="assistantQuery">Busca un código o escribe «ayuda»</label><div><input id="assistantQuery" maxlength="200" placeholder="Ej.: inventario, botones, Lua…" autocomplete="off"><button type="submit" aria-label="Buscar con el asistente">↗</button></div></form></div>`;
  const launcher = document.createElement('button');
  launcher.id = 'assistantLauncher'; launcher.className = 'assistant-launcher'; launcher.type = 'button';
  launcher.innerHTML = guideLogo + '<span>Tu guía RCC</span>';
  launcher.setAttribute('aria-controls','libraryAssistant');launcher.setAttribute('aria-expanded','false');
  document.body.append(assistant, launcher);
  let assistantReturn = null;
  function showAssistant(focus = true) {
    if ($('welcomeDialog').open) return;
    refreshQuestions();
    assistantReturn = document.activeElement;
    assistant.hidden = false; launcher.setAttribute('aria-expanded','true');
    $('dockAssistant').setAttribute('aria-expanded','true');
    if (focus) $('assistantQuery').focus({preventScroll:true});
  }
  function hideAssistant() {assistant.hidden = true;launcher.setAttribute('aria-expanded','false');$('dockAssistant').setAttribute('aria-expanded','false');assistantReturn?.focus({preventScroll:true});}
  launcher.onclick = () => assistant.hidden ? showAssistant() : hideAssistant();
  $('dockAssistant').setAttribute('aria-controls','libraryAssistant');$('dockAssistant').setAttribute('aria-expanded','false');
  $('dockAssistant').onclick = () => assistant.hidden ? showAssistant() : hideAssistant();
  $('assistantClose').onclick = hideAssistant;
  assistant.addEventListener('keydown', event => {if(event.key === 'Escape') {event.preventDefault();hideAssistant();}});
  const reply = text => {$('assistantReply').textContent=text;};
  const goCatalog = (query, section='all') => {
    reply(query ? `Buscando «${query}» en el catálogo. Puedes ajustar los filtros para afinar los resultados.` : 'Explora las fichas y revisa sus requisitos antes de copiar.');
    window.RCCNavigation.search(query,section);
    $('catalogHeading').scrollIntoView({block:'start',behavior:'instant'});
  };
  const actions = {
    executors: () => {reply('El panel incluye Solara, Wave, Xeno, Velocity, Delta, Arceus X, Codex y Vega X. Consulta los requisitos: su compatibilidad no está verificada.');},
    questions: () => {refreshQuestions();reply('Elige una pregunta sugerida o cambia el tema para explorar más opciones.');},
    requirements: () => reply(guide.answers.requirements),
    downloads: () => reply(guide.answers.downloads),
    safety: () => reply(guide.answers.safety),
    release: () => reply(guide.answers.release),
    search: () => {reply('Escribe el nombre de un juego, una función o una etiqueta. Busco códigos publicados, no genero código.');$('assistantQuery').focus();},
    recommend: (query='') => {
      const box=$('assistantRecommendations');box.replaceChildren();
      const items=window.RCCNavigation.recommend(query);
      if(!items.length) {if(window.RCCNavigation.ready()&&query){goCatalog(query);return;}return reply('Las recomendaciones aparecen cuando termina de cargar el catálogo. Si hay un error, usa Reintentar en la biblioteca.');}
      reply(query ? `Estas fichas publicadas coinciden con «${query}». Consulta el entorno y los requisitos antes de usarlas.` : 'Estas recomendaciones provienen de fichas reales del catálogo. Abre una búsqueda para revisar su contenido.');
      items.forEach(item => {const button=document.createElement('button');button.type='button';button.textContent=item.name;button.onclick=()=>goCatalog(item.query,item.section);box.append(button);});
    },
    games: () => goCatalog('','games'), web: () => goCatalog('','web'),
    filters: () => {hideAssistant();openPanel('explore');}, appearance: () => {hideAssistant();openPanel('appearance');}, tools: () => {hideAssistant();openPanel('tools');},
    recent: () => {window.RCCNavigation.section('all',{recent:true});reply('Aquí están los últimos códigos que has copiado en este navegador.');$('catalogHeading').scrollIntoView({block:'start'});},
    favorites: () => {hideAssistant();$('favoritesBtn').click();},
    trending: () => {window.RCCNavigation.section('all',{view:'trending'});reply('Tendencias muestra las copias y descargas registradas. Puede estar vacía si todavía no hay actividad.');$('catalogHeading').scrollIntoView({block:'start'});},
    updates: () => {window.RCCNavigation.section('all',{view:'updates'});reply('Estas son las fichas de la actualización del catálogo. Consulta sus cambios al abrirlas.');$('catalogHeading').scrollIntoView({block:'start'});},
    motion: () => goCatalog('Movimiento RCC','web'),
    compatibility: () => {location.href='compatibilidad.html';}, guide: () => {hideAssistant();$('welcomeHelp').click();},
    clear: () => {$('resetFilters').click();reply('Filtros y búsqueda limpiados. Puedes empezar de nuevo.');},
    top: () => {window.scrollTo({top:0,behavior:'instant'});reply('Estás al principio de RCC. El panel superior abre cada espacio.');},
    help: () => {reply('Puedo explicar la actualización, loadstring y HttpGet, mostrar los ejecutores y las precauciones de descarga, sugerir preguntas, buscar, recomendar fichas y abrir filtros, personalización, herramientas, recientes, favoritos o tendencias. Para soporte detallado, abre el Centro de ayuda.');}
  };
  function answerSuggestion(item) {
    $('assistantRecommendations').replaceChildren();
    if(item.query) return goCatalog(item.query);
    if(item.action === 'executors') {
      assistant.querySelector('[data-open-executors]').click();
    } else actions[item.action]();
  }
  function refreshQuestions() {
    const subjects=window.RCCNavigation.ready()?window.RCCNavigation.assistantSubjects():[];
    const topic=$('assistantTopic').value;
    const questions=guide.sample(subjects,topic,4);
    $('assistantQuestions').replaceChildren(...questions.map(item=>{
      const button=document.createElement('button');button.type='button';button.textContent=item.label;
      button.onclick=()=>answerSuggestion(item);return button;
    }));
    $('assistantQuestionCount').textContent=subjects.length
      ? `${guide.count(subjects,topic).toLocaleString('es')} preguntas posibles en este tema · respuestas guiadas, sin IA`
      : 'Preguntas de ayuda disponibles; el catálogo añade más al terminar de cargar.';
  }
  $('assistantShuffle').onclick=refreshQuestions;
  $('assistantTopic').onchange=refreshQuestions;
  let subjectsReady=false;
  window.addEventListener('rcc:results',()=>{if(!subjectsReady&&window.RCCNavigation.ready()){subjectsReady=true;refreshQuestions();}});
  assistant.querySelectorAll('[data-assist]').forEach(button => {button.type='button';button.onclick=() => { $('assistantRecommendations').replaceChildren();actions[button.dataset.assist]();};});
  $('assistantForm').onsubmit = event => {
    event.preventDefault(); const query=$('assistantQuery').value.trim();if(!query) return reply('Escribe qué código quieres encontrar.');
    const key=window.RCCCatalogFilters.normalize(query);
    const guided=guide.resolve(key);
    if(guided) return answerSuggestion(guided);
    const intents={ayuda:'help',personalizar:'appearance',herramientas:'tools',favoritos:'favorites',recientes:'recent',tendencias:'trending',recomendaciones:'recommend',recomiendame:'recommend','limpiar filtros':'clear'};
    $('assistantRecommendations').replaceChildren();
    if(intents[key]) return actions[intents[key]]();
    if(/^(recomiendame|recomienda|recomendaciones)(\s|$)/.test(key)) {
      const subject=query.replace(/^(recomi[ée]ndame|recomienda|recomendaciones)\s*/i,'').replace(/^(algo|cosas|codigos|códigos|scripts)\s*/i,'').replace(/^(para|de|sobre)\s*/i,'').trim();
      return actions.recommend(subject);
    }
    const navigation=[[/^(abre|abrir|muestra|mostrar|ver) (los |las |el |la |mis )?favoritos$/,'favorites'],[/^(abre|abrir|muestra|mostrar|ver) (el |la |los |las )?(personalizacion|temas|estilos)$/,'appearance'],[/^(abre|abrir|muestra|mostrar|ver) (las |los )?herramientas$/,'tools'],[/^(como buscar|que puedes hacer|necesito ayuda)$/,'help']];
    const command=navigation.find(([pattern])=>pattern.test(key));
    if(command)actions[command[1]]();else goCatalog(query);
  };
  const notice=document.createElement('div');notice.className='library-notice';notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  notice.innerHTML='<div><strong>Buscamos en una biblioteca.</strong><p>RCC no es una IA ni un generador de código. No hay coincidencias con esa búsqueda y esos filtros. Prueba otras palabras o limpia los filtros.</p></div><button type="button" aria-label="Cerrar aviso">×</button>';
  document.body.append(notice);
  let noticeTimer, debounce, lastQuery='';
  function dismissNotice() {notice.hidden=true;clearTimeout(noticeTimer);}
  notice.querySelector('button').onclick=dismissNotice;
  window.addEventListener('rcc:results', event => {
    clearTimeout(debounce); const {count,query}=event.detail;
    if(!assistant.hidden && query) {
      reply(count ? `${count.toLocaleString('es')} coincidencias para «${query}». Puedo ayudarte a afinar la búsqueda con filtros o recomendaciones.` : `No hay coincidencias para «${query}» con estos filtros. RCC no es una IA ni un generador de código. Prueba las sugerencias o limpia los filtros.`);
      const box=$('assistantRecommendations');box.replaceChildren();
      if(!count)window.RCCNavigation.suggestions(query,4).forEach(item=>{const button=document.createElement('button');button.type='button';button.textContent=(item.correction?'¿Quisiste decir? ':'')+item.label;button.onclick=()=>goCatalog(item.query);box.append(button);});
    }
    if(count || !query){dismissNotice();lastQuery='';return;}
    if(lastQuery===query) return;
    debounce=setTimeout(()=>{lastQuery=query;notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(dismissNotice,9000);},800);
  });
  window.RCCStudio={openPanel,showAssistant,reply};
})();
