/* YouTube handles streaming; only browser playback preferences are stored here. */
(() => {
  const storageKey='rcc_background_music';
  const firstTrack={id:'kXB2Of4QrNQ',title:'Primera canción',channel:'YouTube'};
  let currentTrack={...firstTrack};
  const nowPlaying=document.getElementById('musicNowPlaying');
  const externalLink=document.getElementById('musicExternalLink');
  const volume=document.getElementById('musicVolume');
  const output=document.getElementById('musicVolumeValue');
  const status=document.getElementById('musicStatus');
  const buttons=[document.getElementById('musicToggle'),document.getElementById('musicQuickToggle')];
  let settings={volume:12,enabled:true};
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(saved){
      if(Number.isFinite(saved.volume))settings.volume=Math.max(0,Math.min(100,saved.volume));
      if(typeof saved.enabled==='boolean')settings.enabled=saved.enabled;
    }
  }catch{}
  let player,ready=false,failed=false,started=false,loading=false,timer;
  function message(text){status.textContent=text;}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch{}}
  function sync(){
    volume.value=settings.volume;output.value=settings.volume+' %';
    nowPlaying.textContent=currentTrack.title+' · '+currentTrack.channel+' · en bucle';
    externalLink.href='https://www.youtube.com/watch?v='+currentTrack.id;
    buttons.forEach(button=>{
      button.textContent=failed?'Reintentar música':settings.enabled?'Pausar música':'Reproducir música';
      button.setAttribute('aria-pressed',String(settings.enabled&&!failed));
    });
  }
  function fail(){
    clearTimeout(timer);failed=true;loading=false;ready=false;sync();
    message('No se pudo reproducir esta canción. Puede tener restricciones de YouTube. Elige otra, reintenta o abre su enlace en YouTube.');
  }
  function play(){
    if(!ready||!settings.enabled||failed)return;
    player.setVolume(settings.volume);
    if(settings.volume>0)player.unMute();else player.mute();
    player.playVideo();
  }
  function createPlayer(){
    if(!window.YT?.Player)return;
    clearTimeout(timer);
    const loadedId=currentTrack.id;
    player=new window.YT.Player('backgroundMusicPlayer',{
      width:240,height:200,videoId:loadedId,host:'https://www.youtube-nocookie.com',
      playerVars:{autoplay:0,controls:1,playsinline:1,loop:1,playlist:loadedId,origin:location.origin},
      events:{
        onReady:()=>{
          clearTimeout(timer);ready=true;loading=false;failed=false;
          player.getIframe().title='Reproductor de música de fondo de YouTube';
          player.setVolume(settings.volume);sync();
          message(settings.enabled?'Iniciando música al '+settings.volume+' %. Si no suena, pulsa Reproducir.':'Música en pausa.');
          if(currentTrack.id!==loadedId){
            if(settings.enabled){player.loadPlaylist({playlist:[currentTrack.id],index:0});player.setLoop(true);}
            else player.cuePlaylist({playlist:[currentTrack.id],index:0});
          }
          play();
        },
        onAutoplayBlocked:()=>{
          message('El navegador necesita un toque para iniciar el audio. Pulsa Reproducir música.');
          buttons.forEach(button=>{button.textContent='Reproducir música';button.setAttribute('aria-pressed','false');});
        },
        onStateChange:event=>{
          if(event.data===1){started=true;settings.enabled=true;sync();save();message('Música reproduciéndose. Ajusta el volumen en Personalización.');}
          if(event.data===2&&started){settings.enabled=false;sync();save();message('Música en pausa.');}
        },
        onError:fail
      }
    });
    timer=setTimeout(()=>{if(!ready)fail();},20000);
  }
  function load(){
    if(loading)return;
    failed=false;loading=true;ready=false;started=false;sync();message('Cargando música de YouTube…');
    if(player){player.destroy();player=null;}
    if(window.YT?.Player){createPlayer();return;}
    document.getElementById('rccYoutubeAPI')?.remove();
    const previous=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{if(typeof previous==='function')previous();if(loading)createPlayer();};
    const script=document.createElement('script');script.id='rccYoutubeAPI';script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=fail;
    document.head.append(script);timer=setTimeout(fail,20000);
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{
    if(failed){settings.enabled=true;save();load();return;}
    const playing=ready&&player.getPlayerState()===1;
    settings.enabled=ready?!playing:!settings.enabled;sync();save();
    if(settings.enabled){play();if(!ready)message('Cargando música de YouTube…');}
    else{if(ready)player.pauseVideo();message('Música en pausa.');}
  }));
  volume.addEventListener('input',()=>{
    settings.volume=Math.max(0,Math.min(100,Number(volume.value)));sync();save();
    if(ready&&!failed){player.setVolume(settings.volume);if(settings.volume>0)player.unMute();else player.mute();}
  });
  // Retry blocked autoplay on a genuine page interaction without overriding pause.
  function unlock(event){
    if(!event.isTrusted||event.target.closest?.('#musicToggle,#musicQuickToggle'))return;
    play();
    document.removeEventListener('pointerdown',unlock);
    document.removeEventListener('keydown',unlock);
  }
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
  const explorer=document.getElementById('musicExplorer');
  const show=document.getElementById('musicShow');
  const searchForm=document.getElementById('musicSearchForm');
  const queryInput=document.getElementById('musicQuery');
  const searchStatus=document.getElementById('musicSearchStatus');
  const results=document.getElementById('musicResults');
  let searchController=null,hasSearched=false;
  function selectTrack(track){
    currentTrack=track;settings.enabled=true;started=false;save();sync();
    results.querySelectorAll('[data-music-id]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.musicId===track.id)));
    if(failed){load();return;}
    if(!ready){message('La canción se reproduce cuando termine de cargar YouTube…');return;}
    player.setVolume(settings.volume);
    if(settings.volume>0)player.unMute();else player.mute();
    player.loadPlaylist({playlist:[track.id],index:0,startSeconds:0});player.setLoop(true);
    message('Cargando '+track.title+'…');
  }
  function youtubeId(value){
    try{
      const url=new URL(value);
      if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
      let id;
      if(['youtu.be','www.youtu.be'].includes(url.hostname))id=url.pathname.split('/')[1];
      else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(url.hostname))id=url.searchParams.get('v')||(/^\/(?:shorts|embed|live)\//.test(url.pathname)?url.pathname.split('/')[2]:null);
      return /^[\w-]{11}$/.test(id||'')?id:null;
    }catch{return null;}
  }
  function renderTracks(tracks){
    results.replaceChildren();
    tracks.forEach(track=>{
      const button=document.createElement('button');button.type='button';button.className='music-result';button.dataset.musicId=track.id;
      button.setAttribute('aria-pressed',String(currentTrack.id===track.id));button.setAttribute('aria-label','Reproducir '+track.title);
      const thumbnail=document.createElement('img');thumbnail.src='https://i.ytimg.com/vi/'+track.id+'/mqdefault.jpg';thumbnail.alt='';thumbnail.loading='lazy';thumbnail.width=160;thumbnail.height=90;thumbnail.onerror=()=>{thumbnail.hidden=true;};
      const text=document.createElement('span');const title=document.createElement('strong');title.textContent=track.title;
      const channel=document.createElement('small');channel.textContent=track.channel||'YouTube';
      const action=document.createElement('small');action.className='music-result-action';action.textContent='Reproducir en bucle';
      text.append(title,channel,action);button.append(thumbnail,text);button.addEventListener('click',()=>selectTrack(track));results.append(button);
    });
  }
  async function search(value){
    const query=value.trim();if(!query)return;
    searchController?.abort();
    const id=youtubeId(query);
    if(id){
      searchController=null;results.setAttribute('aria-busy','false');
      selectTrack({id,title:'Canción desde enlace',channel:'YouTube'});searchStatus.textContent='Enlace seleccionado. La canción se repite en bucle.';return;
    }
    if(/^https?:\/\//i.test(query)){searchStatus.textContent='Pega un enlace válido de YouTube o escribe una canción o artista.';return;}
    const controller=new AbortController();searchController=controller;hasSearched=true;
    const timeout=setTimeout(()=>controller.abort(),12000);
    results.replaceChildren();results.setAttribute('aria-busy','true');
    for(let i=0;i<4;i++){const skeleton=document.createElement('div');skeleton.className='music-result-skeleton';skeleton.setAttribute('aria-hidden','true');results.append(skeleton);}
    searchStatus.textContent='Buscando en YouTube…';
    try{
      const response=await fetch('/api/music-search?'+new URLSearchParams({q:query}),{signal:controller.signal});
      const data=await response.json();if(!response.ok||!Array.isArray(data.videos))throw Error('Search unavailable');
      if(searchController!==controller)return;
      const tracks=data.videos.filter(track=>/^[\w-]{11}$/.test(track.id||'')&&typeof track.title==='string'&&typeof track.channel==='string').slice(0,12);
      renderTracks(tracks);searchStatus.textContent=tracks.length?tracks.length+' resultados de YouTube. Elige una canción para reproducirla en bucle.':'No encontramos canciones. Prueba otro nombre o pega un enlace de YouTube.';
    }catch{
      if(searchController!==controller)return;
      results.replaceChildren();searchStatus.textContent='No se pudo consultar YouTube. Vuelve a buscar o pega el enlace de una canción.';
    }finally{clearTimeout(timeout);if(searchController===controller){results.setAttribute('aria-busy','false');searchController=null;}}
  }
  function toggleExplorer(open){
    explorer.hidden=!open;show.setAttribute('aria-expanded',String(open));show.textContent=open?'Ocultar música':'Mostrar música';
    if(open){
      explorer.scrollIntoView({block:'start',behavior:'instant'});queryInput.focus({preventScroll:true});
      if(!hasSearched){queryInput.value='lofi para programar';search(queryInput.value);}
    }
  }
  show.addEventListener('click',()=>toggleExplorer(explorer.hidden));
  document.getElementById('musicHide').addEventListener('click',()=>{toggleExplorer(false);document.getElementById('personalization').open=true;show.focus();});
  searchForm.addEventListener('submit',event=>{event.preventDefault();search(queryInput.value);});
  document.querySelectorAll('[data-music-query]').forEach(button=>button.addEventListener('click',()=>{queryInput.value=button.dataset.musicQuery;search(queryInput.value);}));
  document.getElementById('musicDefault').addEventListener('click',()=>selectTrack({...firstTrack}));
  sync();load();
})();
