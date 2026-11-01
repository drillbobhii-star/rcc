/* Public reference media. Artwork is illustrative; videos are matched by public titles. */
(() => {
  let images = {};
  let stopVideo=()=>{};
  window.RCCStopScriptVideo=()=>stopVideo();
  fetch('assets/game-images.json').then(response => response.ok ? response.json() : {}).then(data => {
    images=data;document.querySelectorAll('[data-game-image]').forEach(element=>fillImage(element,element._rccScript));
  }).catch(()=>{});
  function fallback(container,script){container.classList.add('game-cover-fallback');container.replaceChildren(window.RCCScriptArt.create(script));}
  function fillImage(container,script) {
    if(!script)return;
    const src=images[script.game_id];
    if(!src||!/^https:\/\/[^/]*rbxcdn\.com\//.test(src))return;
    const image=document.createElement('img');image.src=src;image.alt='Imagen de referencia de '+script.game;image.loading='lazy';image.decoding='async';
    image.onerror=()=>fallback(container,script);
    container.replaceChildren(image);container.classList.remove('game-cover-fallback');
  }
  function cover(script) {
    const element=document.createElement('div');element.className='game-cover game-cover-fallback';element.dataset.gameImage=script.game_id||'';element.dataset.gameName=script.game||script.name;element._rccScript=script;
    fallback(element,script);fillImage(element,script);return element;
  }
  window.enhanceGameCard=(script,card)=>{
    card.prepend(cover(script));
    if(script.game&&script.platform==='roblox'){
      const video=document.createElement('button');video.type='button';video.className='card-video-button';video.textContent='▷ Video';video.setAttribute('aria-label','Buscar video de referencia de '+script.name);
      video.onclick=event=>{event.stopPropagation();card.click();document.getElementById('scriptVideoToggle')?.click();};
      card.querySelector('.card-top').append(video);
    }
  };
  const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};
  function videoReference(script,links,body) {
    const toggle=document.createElement('button');toggle.id='scriptVideoToggle';toggle.type='button';toggle.className='script-video-toggle';toggle.textContent='▷ Video de referencia';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','scriptVideoPanel');links.append(toggle);
    const section=document.createElement('section');section.id='scriptVideoPanel';section.className='script-video-panel';section.hidden=true;section.setAttribute('aria-label','Video de referencia de '+script.name);
    const heading=document.createElement('h4');heading.textContent='Referencia en YouTube';
    const status=document.createElement('p');status.className='script-video-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const player=document.createElement('div');player.className='script-video-player';player.hidden=true;
    const details=document.createElement('div');details.className='script-video-details';
    const choices=document.createElement('div');choices.className='script-video-choices';
    const controls=document.createElement('div');controls.className='script-video-controls';
    const retry=document.createElement('button');retry.type='button';retry.textContent='Reintentar búsqueda';retry.hidden=true;
    const search=document.createElement('a');search.href='https://www.youtube.com/results?search_query='+encodeURIComponent(script.name+' '+script.game+' script showcase');search.target='_blank';search.rel='noopener noreferrer';search.textContent='Buscar en YouTube ↗';
    const close=document.createElement('button');close.type='button';close.textContent='Cerrar video';
    controls.append(retry,search,close);section.append(heading,status,player,details,choices,controls);body.append(section);
    let controller=null,videos=[],selected=0,loading=false;
    const stop=()=>{controller?.abort();controller=null;loading=false;player.replaceChildren();player.hidden=true;};
    stopVideo=()=>{stop();section.hidden=true;toggle.setAttribute('aria-expanded','false');};
    function play(index){
      selected=index;const video=videos[index];if(!video)return;
      const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+video.id+'?rel=0';frame.title=video.title;frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
      player.replaceChildren(frame);player.hidden=false;details.replaceChildren();
      const title=document.createElement('strong');title.textContent=video.title;
      const channel=document.createElement('p');channel.textContent=video.channel?'Canal: '+video.channel:'Canal no disponible';
      const watch=document.createElement('a');watch.href='https://www.youtube.com/watch?v='+video.id;watch.target='_blank';watch.rel='noopener noreferrer';watch.textContent='Ver en YouTube ↗';
      const note=document.createElement('p');note.className='script-video-note';note.textContent='Coincidencia por nombre del script y juego. Puede mostrar otra versión. Si el autor impide la reproducción aquí, abre el enlace de YouTube.';
      details.append(title,channel,watch,note);status.textContent='Referencia encontrada por título. No confirma que el script siga funcionando.';
      [...choices.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    }
    async function load(){
      stop();controller=new AbortController();const signal=controller.signal;loading=true;retry.hidden=true;videos=[];details.replaceChildren();choices.replaceChildren();section.setAttribute('aria-busy','true');status.textContent='Buscando una referencia del script y del juego en YouTube…';
      try{
        const query=new URLSearchParams({id:script.id,name:script.name.slice(0,300),game:script.game.slice(0,150)});
        const response=await fetch('/api/script-video?'+query,{signal});const data=await response.json();
        if(!response.ok)throw new Error('Lookup unavailable');
        if(signal.aborted||!section.isConnected)return;
        videos=Array.isArray(data.videos)?data.videos.filter(item=>/^[\w-]{11}$/.test(item.id)&&typeof item.title==='string').slice(0,3):[];
        if(!videos.length){status.textContent='No encontramos una coincidencia suficiente para este script. Puedes buscar en YouTube; no asignamos un video de otro script.';retry.hidden=false;return;}
        videos.forEach((video,index)=>{const button=document.createElement('button');button.type='button';button.textContent=video.title;button.onclick=()=>play(index);button.setAttribute('aria-pressed',String(index===0));choices.append(button);});
        if(videos.length===1)choices.hidden=true;else choices.hidden=false;
        play(0);
      }catch(error){if(!signal.aborted){status.textContent='No se pudo consultar YouTube en este momento. Reintenta o abre la búsqueda en YouTube.';retry.hidden=false;}}
      finally{if(!signal.aborted){loading=false;section.removeAttribute('aria-busy');}}
    }
    function hide(){stop();section.hidden=true;section.removeAttribute('aria-busy');toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});}
    close.onclick=hide;retry.onclick=load;
    toggle.onclick=()=>{
      if(!section.hidden)return hide();
      section.hidden=false;toggle.setAttribute('aria-expanded','true');
      if(videos.length&&!loading)play(selected);else load();
      section.scrollIntoView({block:'nearest',behavior:'instant'});
    };
  }
  window.enhanceGameDetail=(script,body)=>{
    stopVideo();
    if(!script.game){body.prepend(window.RCCScriptArt.create(script,true));return;}
    const panel=document.createElement('section');panel.className='game-reference';
    const artwork=cover(script);artwork.classList.add('reference-thumb');panel.append(artwork);
    const text=document.createElement('div'),title=document.createElement('h4');title.textContent=script.game;text.append(title);
    const status=document.createElement('p');status.className='key-status';const tags=script.tags||[];
    status.textContent=tags.includes('Con clave')?'Requiere llave; comprueba las instrucciones antes de ejecutar.':tags.includes('Sin clave')?'Sin llave declarada; puede cambiar con las actualizaciones.':script.type==='source'?'Receta RCC: no necesita llave. Se utiliza en tu propio proyecto de Studio.':'Estado de llave sin confirmar. Comprueba los requisitos antes de ejecutar.';text.append(status);
    const links=document.createElement('div');links.className='game-links';
    function link(label,value){const url=safeUrl(value);if(!url)return;const anchor=document.createElement('a');anchor.href=url;anchor.textContent=label;anchor.target='_blank';anchor.rel='noopener noreferrer';links.append(anchor);}
    if(/^[1-9]\d*$/.test(script.game_id))link('Jugar en Roblox ↗','https://www.roblox.com/games/'+script.game_id);
    if(script.key_url)link('Obtener llave ↗',script.key_url);
    text.append(links);panel.append(text);body.prepend(panel);
    if(script.platform==='roblox')videoReference(script,links,body);
  };
})();
