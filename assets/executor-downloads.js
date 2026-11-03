/* External destinations supplied for the catalog. No executables are hosted here. */
(() => {
  const executors = [
    {id:'solara',name:'Solara',url:'https://getsolara.dev/download/'},
    {id:'wave',name:'Wave',url:'https://waveexecutor.com/'},
    {id:'xeno',name:'Xeno',url:'https://www.xeno.onl/downloads'},
    {id:'velocity',name:'Velocity',url:'https://github.com/ltnproject/velocity/blob/main/README.md',image:'velocity.webp'},
    {id:'delta',name:'Delta',url:'https://deltaexploits.dev/delta-executor-android'},
    {id:'arceus',name:'Arceus X',url:'https://github.com/arceuusxe/arceus-neo'},
    {id:'codex',name:'Codex',url:'https://rscripts.net/executors/codex'},
    {id:'vega',name:'Vega X',url:'https://github.com/Coltenblox/VegaX/releases'}
  ];
  const drawer=document.createElement('dialog');
  drawer.id='executorDrawer';drawer.className='executor-drawer';
  drawer.setAttribute('aria-labelledby','executorHeading');
  drawer.innerHTML=`<header class="executor-heading"><div><span class="eyebrow">GUÍA DE EJECUTORES</span><h2 id="executorHeading">Elige dónde continuar<span>.</span></h2></div><button type="button" class="btn btn-ghost" data-executor-close aria-label="Cerrar panel de ejecutores">Cerrar</button></header>
    <p class="executor-intro">¿No tienes un ejecutor adecuado? Estas son las opciones enlazadas para consultar sus requisitos. El soporte de loadstring y HttpGet depende de la versión y el dispositivo; no se ha verificado en estos ejecutores.</p>
    <aside class="executor-caution"><strong>Cuidado con los anuncios y las descargas</strong><p>Las páginas externas pueden mostrar anuncios, redirecciones o botones de descarga engañosos. Algunos navegadores y Windows pueden bloquear enlaces o archivos por seguridad. Mantén el antivirus y las protecciones activos; si aparece una alerta, no continúes sin verificar el origen.</p></aside>
    <div class="executor-options" aria-label="Opciones de ejecutores"></div>
    <p class="executor-source-note">Logos e iconos del sitio o del perfil del repositorio. Los enlaces no implican afiliación ni garantizan seguridad o compatibilidad.</p>
    <section class="executor-confirm" hidden aria-labelledby="executorConfirmHeading"><span class="eyebrow">ENLACE EXTERNO</span><h3 id="executorConfirmHeading" tabindex="-1"></h3><p id="executorDestination"></p><p id="executorCountdown" role="status" aria-live="polite" aria-atomic="true"></p><div class="executor-confirm-actions"><button type="button" class="btn btn-primary" id="executorProceed" disabled>Sí, ir a la descarga</button><button type="button" class="btn btn-ghost" id="executorCancel">No, volver</button></div><p>Se abre la página indicada; la descarga y sus requisitos se gestionan allí.</p></section>`;
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
    const text=document.createElement('span'),name=document.createElement('strong'),host=document.createElement('small');name.textContent=executor.name;host.textContent=new URL(executor.url).hostname;text.append(name,host);button.append(logo,fallback,text);
    button.addEventListener('click',()=>{
      reset();selected=executor;sourceButton=button;list.hidden=true;confirm.hidden=false;
      heading.textContent=`¿Deseas descargar ${executor.name}?`;destination.textContent=executor.url;
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
