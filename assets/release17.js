/* Shared ranking for static hosting. No credentials or database keys in the client. */
let trendsRequest=null;
let trendsUpdatedAt=null;
let trendsWriteFailed=false;
function trendsEndpoint(){
  const url=new URL(window.RCCTrendsConfig.apiUrl,location.href);
  if(url.protocol!=='https:'&&!(url.hostname==='localhost'&&url.protocol==='http:'))throw Error('Endpoint inválido');
  return url.href;
}
async function trendsFetch(options={}){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  try{
    const response=await fetch(trendsEndpoint(),{...options,credentials:'omit',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('Servicio no disponible');
    return await response.json();
  }finally{clearTimeout(timeout);}
}
function renderTrendsStatus(){
  const panel=document.getElementById('trendsStatus');
  panel.hidden=releaseView!=='trending';
  let message=trendStatus==='loading'?'Actualizando tendencias…':trendStatus==='error'?(trendsUpdatedAt?'No se pudo actualizar. Se muestra la última consulta de esta visita.':'No se pudo conectar con las tendencias. Pulsa Actualizar para reintentar.'):(trendsUpdatedAt?'Última consulta: '+trendsUpdatedAt.toLocaleTimeString('es')+'. Actualización automática cada minuto.':'');
  if(trendsWriteFailed)message+=' No se pudo registrar la última acción; el código sigue disponible.';
  panel.querySelector('[role="status"]').textContent=message;
  panel.querySelector('button').disabled=trendStatus==='loading';
}
function loadTrends(){
  if(trendsRequest)return trendsRequest;
  trendStatus='loading';renderTrendsStatus();
  trendsRequest=(async()=>{
    try{
      const data=await trendsFetch();
      if(!Array.isArray(data.items))throw Error('Respuesta inválida');
      const rows=data.items.filter(row=>typeof row.id==='string'&&[row.total,row.copies,row.downloads].every(n=>Number.isSafeInteger(n)&&n>=0)&&row.total===row.copies+row.downloads);
      trendCounts=Object.fromEntries(rows.map(row=>[row.id,row]));
      trendStatus='ready';trendsUpdatedAt=new Date();
    }catch{trendStatus='error';}
    finally{trendsRequest=null;if(releaseView==='trending')render();renderTrendsStatus();}
  })();
  return trendsRequest;
}
let trendsVisitorId;
function getTrendsVisitor(){
  if(trendsVisitorId)return trendsVisitorId;
  try{const saved=localStorage.getItem('rcc_trends_browser');if(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved||''))trendsVisitorId=saved;}catch{}
  trendsVisitorId ||= crypto.randomUUID();
  // Anonymous browser identifier only; the shared counts live in Netlify Database.
  try{localStorage.setItem('rcc_trends_browser',trendsVisitorId);}catch{}
  return trendsVisitorId;
}
async function recordCatalogAction(id,action){
  if(!id||!['copy','download'].includes(action))return;
  try{await trendsFetch({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,action,visitorId:getTrendsVisitor()})});trendsWriteFailed=false;if(releaseView==='trending')await loadTrends();}
  catch{trendsWriteFailed=true;}
  renderTrendsStatus();
}
for(const [id,view] of [['trendingTab','trending'],['updatesTab','updates']])document.getElementById(id).onclick=()=>{selectSection('all',{view});if(view==='trending')loadTrends();};
(() => {
  const panel=document.createElement('section');panel.id='trendsStatus';panel.className='trends-status';panel.hidden=true;
  const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const button=document.createElement('button');button.type='button';button.className='btn btn-ghost';button.textContent='Actualizar tendencias';button.onclick=()=>loadTrends();
  panel.append(status,button);document.getElementById('activeFilters').before(panel);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&releaseView==='trending')loadTrends();});
  window.addEventListener('online',()=>{if(releaseView==='trending')loadTrends();});
  setInterval(()=>{if(!document.hidden&&releaseView==='trending')loadTrends();},window.RCCTrendsConfig.refreshMs);
})();
(() => {
  const logo=document.getElementById('logoHome');
  logo.onclick=event=>{event.preventDefault();selectSection('all');closeSidebar();window.scrollTo({top:0,behavior:'instant'});history.replaceState(null,'',location.pathname);document.getElementById('heroTitle').focus({preventScroll:true});};
  const box=document.createElement('fieldset');box.className='logo-settings';box.innerHTML='<legend>Logo · Movimiento 1.7</legend><label>Animación <select id="logoAnimation"><option value="float">Flotar</option><option value="pulse">Respirar</option><option value="spin">Girar</option><option value="swing">Balancear</option><option value="flip">Voltear</option><option value="bounce">Rebotar</option><option value="none">Sin animación</option></select></label><label>Reproducción <select id="logoMode"><option value="fixed">Mantener selección</option><option value="auto">Cambiar automáticamente</option></select></label><label>Duración <input id="logoSpeed" type="range" min="2" max="12" value="5"><output id="logoSeconds">5 s</output></label><p>El modo automático cambia cada 12 segundos. Respeta la opción de reducir movimiento.</p>';
  document.getElementById('personalization').append(box);
  const animation=box.querySelector('#logoAnimation'),mode=box.querySelector('#logoMode'),speed=box.querySelector('#logoSpeed');
  try{const saved=JSON.parse(localStorage.getItem('rcc_logo17'));if(saved){if([...animation.options].some(o=>o.value===saved.animation))animation.value=saved.animation;mode.value=saved.mode==='auto'?'auto':'fixed';speed.value=Number(saved.speed)>=2&&Number(saved.speed)<=12?saved.speed:5;}}catch{}
  function apply(save=false){logo.dataset.animation=animation.value;logo.style.setProperty('--logo-duration',speed.value+'s');box.querySelector('output').value=speed.value+' s';if(save)try{localStorage.setItem('rcc_logo17',JSON.stringify({animation:animation.value,mode:mode.value,speed:speed.value}));}catch{}}
  box.addEventListener('input',()=>apply(true));apply();
  setInterval(()=>{if(mode.value!=='auto'||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-paused'))return;const choices=[...animation.options].filter(o=>o.value!=='none');animation.value=choices[(choices.findIndex(o=>o.value===animation.value)+1)%choices.length].value;apply();},12000);
})();
