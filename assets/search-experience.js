/* Shared autocomplete and an illustrative executor reel; no code is run or copied. */
(() => {
  const $=id=>document.getElementById(id);
  function autocomplete(input,prefix,select) {
    input.maxLength=200;
    input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('autocomplete','off');
    const host=document.createElement('div');host.className='search-suggestions';host.hidden=true;
    const heading=document.createElement('div');heading.className='suggestion-heading';heading.textContent='EN TODA LA BIBLIOTECA';
    const list=document.createElement('div');list.id=prefix+'Options';list.setAttribute('role','listbox');list.setAttribute('aria-label','Sugerencias del catálogo');
    const status=document.createElement('p');status.className='suggestion-status';status.setAttribute('role','status');
    const tip=document.createElement('small');tip.textContent='↑ ↓ para elegir · Enter para buscar · Esc para cerrar';
    host.append(heading,list,status,tip);input.parentElement.append(host);
    input.setAttribute('aria-controls',list.id);
    let rows=[],active=-1,timer;
    const close=()=>{host.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;clearTimeout(timer);};
    function activate(index) {
      active=index;
      [...list.children].forEach((option,i)=>option.setAttribute('aria-selected',String(i===active)));
      if(active>=0){input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest',behavior:'instant'});}
      else input.removeAttribute('aria-activedescendant');
    }
    function choose(index){if(!rows[index])return;const row=rows[index];input.value=row.query;close();select(row.query,row);}
    function update() {
      if(document.activeElement!==input)return close();
      host.dataset.query=input.value;
      const ready=window.RCCNavigation.ready();
      rows=ready?window.RCCNavigation.suggestions(input.value,10):[];
      active=-1;input.removeAttribute('aria-activedescendant');list.replaceChildren();
      rows.forEach((row,index)=>{
        const option=document.createElement('div');option.id=prefix+'Option'+index;option.className='search-suggestion';option.setAttribute('role','option');option.setAttribute('aria-selected','false');
        const icon=document.createElement('span');icon.className='suggestion-symbol';icon.textContent=row.correction?'↻':'↗';icon.setAttribute('aria-hidden','true');
        const copy=document.createElement('span');copy.className='suggestion-copy';
        const label=document.createElement('strong');label.textContent=row.label;
        const detail=document.createElement('small');detail.textContent=(row.correction?'¿Quisiste decir? · ':'')+row.kind+(row.count>1?' · '+row.count.toLocaleString('es')+' fichas':'');
        copy.append(label,detail);option.append(icon,copy);
        option.onpointerdown=event=>event.preventDefault();option.onpointermove=()=>activate(index);option.onclick=()=>choose(index);list.append(option);
      });
      status.textContent=!ready?(window.RCCNavigation.status()==='error'?'No se pudo cargar el catálogo. Usa Reintentar para recuperar las sugerencias.':'El catálogo se está cargando. Las sugerencias aparecen al terminar.'):rows.length? '':input.value.trim()?'Sin coincidencias. RCC es una biblioteca, no una IA ni un generador. Prueba otra palabra o limpia los filtros.':'No hay sugerencias disponibles.';
      status.hidden=!status.textContent;host.hidden=false;input.setAttribute('aria-expanded','true');
    }
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(update,110);};
    input.addEventListener('focus',update);input.addEventListener('input',schedule);
    input.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==input)close();},120));
    input.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!host.hidden){event.preventDefault();event.stopPropagation();close();return;}
      if(event.key==='Tab')return close();
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();if(host.hidden)update();if(!rows.length)return;
        activate(event.key==='ArrowDown'?(active+1)%rows.length:(active<=0?rows.length-1:active-1));
      }else if(event.key==='Enter'){
        if(active>=0&&!host.hidden){event.preventDefault();choose(active);}
        else close();
      }
    });
    window.addEventListener('rcc:results',()=>{if(!host.hidden)schedule();});
    return {close};
  }
  const main=autocomplete($('search'),'catalogSearch',query=>{
    window.RCCNavigation.search(query);
    $('catalogHeading').focus({preventScroll:true});
    $('catalogHeading').scrollIntoView({block:'start',behavior:'instant'});
  });
  const helper=autocomplete($('assistantQuery'),'helperSearch',query=>{
    window.RCCNavigation.search(query);
    window.RCCStudio.reply(`Buscando «${query}» en las fichas publicadas. Revisa el entorno y la compatibilidad antes de copiar.`);
  });
  // Pressing Enter without a selected suggestion performs a normal library search.
  $('search').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.defaultPrevented){main.close();$('catalogHeading').scrollIntoView({block:'start',behavior:'instant'});}});
  $('assistantForm').addEventListener('submit',()=>helper.close());

  const clip=document.querySelector('.hero-intro .code-preview');
  if(!clip)return;
  clip.classList.add('executor-cinema');clip.removeAttribute('aria-hidden');clip.setAttribute('aria-label','Demostración animada de copiar y pegar código de la biblioteca');
  clip.innerHTML=`<div class="cinema-bar"><span class="cinema-dot"></span><span>RCC / DEL CATÁLOGO AL EDITOR</span><button id="cinemaPause" type="button" aria-pressed="false" aria-label="Pausar demostración">Ⅱ</button></div><div class="cinema-stage" aria-hidden="true"><div class="cinema-source"><div class="cinema-window-label">BIBLIOTECA RCC <span>01</span></div><div class="cinema-code"><span>-- Tu proyecto</span><b>local</b> idea = <em>"RCC"</em><br><b>print</b>(idea)</div><span class="cinema-copy">Copiar código ↗</span></div><div class="cinema-transfer"><span class="cinema-avatar">RCC</span><i></i><span class="cinema-packet">{ código }</span><i></i></div><div class="cinema-target"><div class="cinema-window-label"><span id="cinemaExecutor">EDITOR</span><span>02</span></div><div class="cinema-paste"><span>-- Tu proyecto</span><b>local</b> idea = <em>"RCC"</em><br><b>print</b>(idea)</div><div class="cinema-placeholder">Pega y revisa el código aquí</div></div></div><div class="cinema-game" aria-hidden="true"><span>ESCENA ILUSTRATIVA / TU PROYECTO</span><div class="cinema-game-floor"></div><div class="cinema-game-platform"></div><div class="cinema-game-player">RCC</div><i class="cinema-game-token"></i></div><div class="cinema-caption"><span><i></i> Copiar → Pegar → Revisar</span><span>CLIP DEMOSTRATIVO</span></div><div class="cinema-controls"><label for="cinemaSelect">Ver con</label><select id="cinemaSelect" aria-label="Ejecutor de la demostración"><option value="">Cargando ejecutores…</option></select></div><p class="cinema-disclaimer">Animación ilustrativa. No ejecuta código ni confirma compatibilidad con el ejecutor. Consulta los requisitos de cada ficha.</p>`;
  const logo=$('logoHome');
  const mini=document.createElement('span');mini.className='logo-microclip';mini.setAttribute('aria-hidden','true');mini.innerHTML='<span>RCC</span><i>{ }</i><b>↗</b>';logo.append(mini);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let names=[],index=0,manualPause=false,manualSelection=false,rotation;
  function setExecutor(name){$('cinemaExecutor').textContent=name;$('cinemaSelect').value=name;mini.title='RCC / '+name;}
  function syncMotion() {
    const paused=manualPause||reduced.matches||document.body.classList.contains('motion-paused');
    clip.classList.toggle('cinema-paused',paused);mini.classList.toggle('cinema-paused',paused);
    $('cinemaPause').setAttribute('aria-pressed',String(paused));$('cinemaPause').setAttribute('aria-label',paused?'Reanudar demostración':'Pausar demostración');$('cinemaPause').textContent=paused?'▶':'Ⅱ';
    $('cinemaPause').disabled=reduced.matches||document.body.classList.contains('motion-paused');
    clearInterval(rotation);
    if(!paused&&!manualSelection)rotation=setInterval(()=>{if(!document.hidden&&names.length){index=(index+1)%names.length;setExecutor(names[index]);}},8000);
  }
  function loadExecutors() {
    if(!window.RCCNavigation.ready())return;
    names=window.RCCNavigation.executors().map(item=>item.name);
    if(!names.length)names=['Editor de tu proyecto'];
    $('cinemaSelect').replaceChildren(...names.map(name=>{const option=document.createElement('option');option.value=name;option.textContent=name;return option;}));
    // Delta is the initial illustration when it is present; every catalog executor remains selectable.
    index=Math.max(0,names.findIndex(name=>name.toLowerCase()==='delta'));setExecutor(names[index]);syncMotion();
    window.removeEventListener('rcc:results',loadExecutors);
  }
  $('cinemaSelect').onchange=event=>{index=names.indexOf(event.target.value);setExecutor(event.target.value);manualSelection=true;syncMotion();};
  $('cinemaPause').onclick=()=>{manualPause=!manualPause;if(!manualPause)manualSelection=false;syncMotion();};
  reduced.addEventListener('change',syncMotion);
  new MutationObserver(syncMotion).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(window.RCCNavigation.ready())loadExecutors();else window.addEventListener('rcc:results',loadExecutors);
  syncMotion();
})();
