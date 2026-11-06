/* Two-step welcome; journey state is persisted through Netlify Database. */
(() => {
  const $=id=>document.getElementById(id);
  const dialog=$('welcomeDialog');
  const search=$('search');
  let step=0, returnFocus=null, completed=false, initialized=false, saveTimer, demoTimer, touched=false, automatic=false;
  let resolveBoot;
  const bootReady=new Promise(resolve=>{resolveBoot=resolve;});
  const scenes={
    explore:{title:'Del buscador a tu proyecto.',text:'Busca por nombre o etiqueta. Usa filtros de plataforma, dispositivo y entorno; abre una ficha para leer los requisitos, copiar o descargar.',art:'<div class="demo-search">Buscar: inventario Lua<span>⌕</span></div><div class="demo-result"><i></i><div>Inventario para tu proyecto<small>Lua / Roblox Studio</small></div><b>↗</b></div>'},
    appearance:{title:'Un RCC que se siente tuyo.',text:'Elige entre ocho temas, incluido Cielo en blanco y azul claro. Ajusta color, cristal, esquinas, tamaño, densidad, movimiento y sonidos. Los cambios se ven al instante.',art:'<div class="demo-swatches"><i></i><i></i><i></i><i></i></div><div class="demo-slider"><span></span></div><small>COLOR / CRISTAL / MOVIMIENTO</small>'},
    tools:{title:'Entiende antes de transformar.',text:'En Herramientas puedes comparar versiones, abrir el análisis de código y ofuscar Lua/Luau. La biblioteca también permite copiar, descargar y consultar compatibilidad.',art:'<div class="demo-code"><span>local idea = "tu proyecto"</span><span>-- Lee. Compara. Prueba.</span><span>return idea</span></div><small>ANÁLISIS / COMPARACIÓN / LUA</small>'}
  };
  function scene(name) {
    const data=scenes[name], box=$('tourDemo');
    box.dataset.scene=name;
    box.querySelector('.demo-scene').innerHTML=data.art;
    box.querySelector('h3').textContent=data.title;box.querySelector('p').textContent=data.text;
    dialog.querySelectorAll('[data-demo]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.demo===name)));
  }
  dialog.querySelectorAll('[data-demo]').forEach(button=>button.onclick=()=>{clearInterval(demoTimer);scene(button.dataset.demo);});
  function renderStep() {
    $('tourFirst').hidden=step!==0;$('tourLast').hidden=step!==1;$('tourBack').hidden=step===0;
    $('tourCounter').textContent=step===0?'01 / 02':'02 / 02';
    $('tourProgress').style.transform=`scaleX(${step===0?.5:1})`;
    $('welcomeTitle').textContent=step===0?'Entra. Explora. Hazlo tuyo.':'De la biblioteca a tu proyecto.';
    $('tourNext').innerHTML=step===0?'Siguiente <span aria-hidden="true">→</span>':'Explorar la biblioteca <span aria-hidden="true">↗</span>';
    dialog.dataset.step=String(step);dialog.scrollTop=0;
  }
  function openGuide(auto = false) {
    if(dialog.open) return;
    automatic = auto === true;
    returnFocus=document.activeElement;step=0;scene('explore');renderStep();
    dialog.showModal();document.body.classList.add('welcome-open');
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.body.classList.contains('motion-paused')){
      let index=0;demoTimer=setInterval(()=>{if(step===0&&!document.hidden&&!document.body.classList.contains('motion-paused'))scene(['explore','appearance','tools'][++index%3]);},4800);
    }
  }
  async function persist(keepalive=false) {
    if(!initialized) return;
    try {
      const response=await fetch('/api/journey',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({completed,state:window.RCCNavigation.state()}),keepalive});
      if(!response.ok) throw new Error('Save unavailable');
      return true;
    } catch {return false;}
  }
  function scheduleSave() {if(!initialized || !completed) return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),1800);}
  async function finish() {
    completed=true;dialog.close('finished');
    await bootReady;
    const saved=await persist();
    if(!saved) window.RCCStudio.reply('Puedes explorar RCC. No se pudo guardar el recuerdo de esta visita; puedes abrir la presentación desde «Cómo usar RCC».');
  }
  $('tourNext').onclick=()=>{if(step===0){step=1;renderStep();$('welcomeTitle').focus({preventScroll:true});}else finish();};
  $('tourBack').onclick=()=>{step=0;renderStep();$('welcomeTitle').focus({preventScroll:true});};
  $('tourSkip').onclick=finish;
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
  dialog.addEventListener('close',()=>{
    clearInterval(demoTimer);document.body.classList.remove('welcome-open');
    if(dialog.returnValue==='finished'){search.focus({preventScroll:true});}
    else returnFocus?.focus({preventScroll:true});
  });
  $('welcomeHelp').addEventListener('click',()=>openGuide());
  new MutationObserver(()=>{
    if(automatic && dialog.open && !$('authEmail').hidden) dialog.close('session');
  }).observe($('authEmail'),{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('keydown',event=>{
    if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'&&!dialog.open&&!$('studioPanel').open&&!document.querySelector('.modal.open')){event.preventDefault();search.focus();search.select();}
  });
  document.addEventListener('input',scheduleSave);document.addEventListener('change',scheduleSave);
  document.addEventListener('click',scheduleSave);window.addEventListener('scroll',scheduleSave,{passive:true});
  window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);if(completed) persist(true);});
  for(const type of ['pointerdown','keydown','wheel','touchstart']) document.addEventListener(type,event=>{if(event.isTrusted)touched=true;},{once:true,passive:true});
  async function boot() {
    let data=null;
    try {const response=await fetch('/api/journey',{signal:AbortSignal.timeout(4500),cache:'no-store'});if(response.ok)data=await response.json();}catch { /* The catalog remains available if journey storage is offline. */ }
    const finishedDuringBoot=completed;
    initialized=true;completed=completed || data?.completed===true;resolveBoot();
    if(finishedDuringBoot) return;
    if(completed){
      if(data.state && !touched){
        const restore=()=>{if(!touched)window.RCCNavigation.restore(data.state);};
        if(window.RCCNavigation.ready())restore();
        else {
          const onReady=()=>{window.removeEventListener('rcc:results',onReady);requestAnimationFrame(restore);};
          window.addEventListener('rcc:results',onReady,{once:true});
        }
      }
    }
    if (!completed && data?.completed === false && !touched) {
      // Wait for the existing auth bootstrap; an unknown session never triggers a popup.
      let timeout;
      const signedIn = await Promise.race([
        Promise.resolve(window.rccSessionReady).catch(()=>null),
        new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),5000);})
      ]);
      clearTimeout(timeout);
      if(signedIn === false && !completed && !touched && $('authEmail').hidden &&
         !document.querySelector('dialog[open],.modal.open') && !document.body.classList.contains('lab-open')) openGuide(true);
    }
  }
  boot();
})();
