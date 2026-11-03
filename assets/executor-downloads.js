/* External destinations supplied for the catalog. No executables are hosted here. */
(() => {
  const executors = [
    {platforms:['windows'],id:'solara',name:'Solara',url:'https://getsolara.dev/download/'},
    {platforms:['windows'],id:'wave',name:'Wave',url:'https://waveexecutor.com/'},
    {id:'xeno',name:'Xeno',url:'https://www.xeno.onl/downloads'},
    {platforms:['windows'],id:'velocity',name:'Velocity',url:'https://github.com/ltnproject/velocity/blob/main/README.md',image:'velocity.webp'},
    {platforms:['android'],id:'delta',name:'Delta',url:'https://deltaexploits.dev/delta-executor-android'},
    {platforms:['android'],id:'arceus',name:'Arceus X',url:'https://github.com/arceuusxe/arceus-neo'},
    {id:'codex',name:'Codex',url:'https://rscripts.net/executors/codex'},
    {platforms:['windows'],id:'vega',name:'Vega X',url:'https://github.com/Coltenblox/VegaX/releases'}
  ];
  // Platforms declared by the linked source or its release asset; not device tests.
  // Xeno and Codex could not be confirmed from the supplied destinations.
  const platforms = [
    {id:'windows',label:'PC · Windows',icon:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 21h8M12 16v5"/>'},
    {id:'android',label:'Móvil · Android',icon:'<path d="M5 11a7 7 0 0 1 14 0v7H5zM8 4 6 1M16 4l2-3M3 12v5M21 12v5M8 18v4M16 18v4"/><path d="M9 8h.01M15 8h.01"/>'},
    {id:'ios',label:'iPhone / iPad · iOS',icon:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 19h2"/>'}
  ];
  function platformBadges(executor) {
    const container=document.createElement('span');container.className='executor-platforms';
    platforms.forEach(platform=>{
      const declared=(executor.platforms||[]).includes(platform.id);
      const badge=document.createElement('span');badge.className='executor-platform '+(declared?'is-declared':'is-unconfirmed');
      badge.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${platform.icon}</svg>`;
      const label=document.createElement('span');label.textContent=platform.label;
      const status=document.createElement('span');status.className='executor-platform-status';status.textContent=declared?'Indicado por la fuente':'Por confirmar';
      badge.append(label,status);container.append(badge);
    });return container;
  }
  const drawer=document.createElement('dialog');
  drawer.id='executorDrawer';drawer.className='executor-drawer';
  drawer.setAttribute('aria-labelledby','executorHeading');
  drawer.innerHTML=`<header class="executor-heading"><div><span class="eyebrow">GUÍA DE EJECUTORES</span><h2 id="executorHeading">Elige dónde continuar<span>.</span></h2></div><button type="button" class="btn btn-ghost" data-executor-close aria-label="Cerrar panel de ejecutores">Cerrar</button></header>
    <p class="executor-intro">¿No tienes un ejecutor adecuado? Estas son las opciones enlazadas para consultar sus requisitos. El soporte de loadstring y HttpGet depende de la versión y el dispositivo; no se ha verificado en estos ejecutores.</p>
    <aside class="executor-caution"><strong>Cuidado con los anuncios y las descargas</strong><p>Las páginas externas pueden mostrar anuncios, redirecciones o botones de descarga engañosos. Algunos navegadores y Windows pueden bloquear enlaces o archivos por seguridad. Mantén el antivirus y las protecciones activos; si aparece una alerta, no continúes sin verificar el origen.</p></aside>
    <p class="executor-platform-note">Plataformas: los iconos distinguen PC con Windows, móvil Android e iPhone/iPad con iOS. «Indicado por la fuente» identifica la plataforma anunciada o el formato de su descarga; no es una prueba de funcionamiento. «Por confirmar» significa que no hay información suficiente para ese sistema. Consulta siempre la versión actual en el enlace.</p>
    <div class="executor-options" aria-label="Opciones de ejecutores"></div>
    <p class="executor-source-note">Logos e iconos del sitio o del perfil del repositorio. Los enlaces no implican afiliación ni garantizan seguridad o compatibilidad.</p>
    <section class="executor-confirm" hidden aria-labelledby="executorConfirmHeading"><span class="eyebrow">ENLACE EXTERNO</span><h3 id="executorConfirmHeading" tabindex="-1"></h3><p id="executorDestination"></p><div id="executorConfirmPlatforms"></div><p id="executorCountdown" role="status" aria-live="polite" aria-atomic="true"></p><div class="executor-confirm-actions"><button type="button" class="btn btn-primary" id="executorProceed" disabled>Sí, ir a la descarga</button><button type="button" class="btn btn-ghost" id="executorCancel">No, volver</button></div><p>Se abre la página indicada; la descarga y sus requisitos se gestionan allí.</p></section>`;
  document.body.append(drawer);
  const list=drawer.querySelector('.executor-options');
  const confirm=drawer.querySelector('.executor-confirm');
  const heading=drawer.querySelector('#executorConfirmHeading');
  const destination=drawer.querySelector('#executorDestination');
  const countdown=drawer.querySelector('#executorCountdown');
  const proceed=drawer.querySelector('#executorProceed');
  let timer=null,selected=null,deadline=0,sourceButton=null,returnFocus=null;
  function clearTimer(){if(timer!==null)clearInterval(timer);timer=null;}
  function reset(){clearTimer();selected=null;deadline=0;proceed.disabled=true;confirm.hidden=true;list.hidden=false;}
  function tick(){
    if(!selected)return;
    const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
    countdown.textContent=seconds?`Lee el aviso. Puedes continuar en ${seconds} ${seconds===1?'segundo':'segundos'}.`:'Ya puedes decidir si deseas continuar.';
    proceed.disabled=seconds>0;
    if(!seconds)clearTimer();
  }
  executors.forEach(executor=>{
    const button=document.createElement('button');button.type='button';button.className='executor-option';
    const logo=document.createElement('img');logo.src='assets/executors/'+(executor.image||executor.id+'.png');logo.alt='';logo.width=44;logo.height=44;
    const fallback=document.createElement('span');fallback.className='executor-monogram';fallback.hidden=true;fallback.textContent=executor.name.slice(0,2).toUpperCase();fallback.setAttribute('aria-hidden','true');
    logo.addEventListener('error',()=>{logo.hidden=true;fallback.hidden=false;});
    const text=document.createElement('span'),name=document.createElement('strong'),host=document.createElement('small');name.textContent=executor.name;host.textContent=new URL(executor.url).hostname;text.className='executor-option-info';text.append(name,host,platformBadges(executor));button.append(logo,fallback,text);
    button.addEventListener('click',()=>{
      reset();selected=executor;sourceButton=button;list.hidden=true;confirm.hidden=false;
      heading.textContent=`¿Deseas descargar ${executor.name}?`;destination.textContent=executor.url;
      const platformSummary=drawer.querySelector('#executorConfirmPlatforms');platformSummary.innerHTML='';platformSummary.append(platformBadges(executor));
      deadline=Date.now()+10000;tick();timer=setInterval(tick,250);heading.focus();
    });list.append(button);
  });
  drawer.querySelector('#executorCancel').addEventListener('click',()=>{reset();sourceButton?.focus();});
  proceed.addEventListener('click',()=>{
    if(!selected||Date.now()<deadline)return;
    const url=selected.url;reset();drawer.close();window.location.assign(url);
  });
  drawer.querySelector('[data-executor-close]').addEventListener('click',()=>drawer.close());
  drawer.addEventListener('close',()=>{reset();returnFocus?.focus();});
  // Keep Escape inside this native dialog; the catalog modal remains open underneath.
  drawer.addEventListener('keydown',event=>{event.stopPropagation();});
  drawer.addEventListener('click',event=>{if(event.target===drawer){const r=drawer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)drawer.close();}});
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-open-executors]');if(!trigger)return;
    event.preventDefault();event.stopPropagation();reset();returnFocus=trigger;drawer.showModal();
  },true);
})();
