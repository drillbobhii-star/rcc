/* Registered profiles only. Public queries use an explicit field allowlist. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const root=$('wbDirectory'),box=$('wbProfiles'),status=$('wbProfilesStatus'),input=$('wbProfileQuery');
  const fields='user_id,display_name,avatar_url,bio,roblox_username,roblox_id,show_roblox,banner_url,is_creator';
  root.querySelector('h2').textContent='Descubre a tu comunidad.';
  root.querySelector('p').textContent='Busca personas registradas, encuentra al creador y guarda tus perfiles favoritos.';
  root.querySelector('label').textContent='Buscar personas';
  input.placeholder='Buscar nombre o usuario de Roblox…';input.autocomplete='off';input.setAttribute('aria-controls','wbProfileSuggestions');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
  let view='all',saved=new Set(),ready=false,revision=0,timer,controller,suggestionsRevision=0,suggestedProfiles=[];
  const quickBox=$('wbProfileSuggestions');
  let page=0,quickPage=0,quickRevision=0,quickController,quickTimer,quickLoading=false,quickHasMore=false;
  const more= document.createElement('button');more.type='button';more.className='social-retry';more.textContent='Cargar más perfiles';more.hidden=true;box.after(more);more.onclick=()=>loadProfiles(true);
  const searchTerm=()=>input.value.trim().replace(/[^\p{L}\p{N}\s@._\-]/gu,'').replace(/^@/,'').slice(0,80).replace(/_/g,'\\_');
  function matchingQuery(sb){let q=publicQuery(sb).order('is_creator',{ascending:false}).order('display_name').order('user_id');const term=searchTerm();if(term)q=q.or('display_name.ilike.%'+term+'%,and(show_roblox.eq.true,roblox_username.ilike.%'+term+'%)');return q;}
  const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  async function preferences(body){const r=await fetch('/api/workbench',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});if(!r.ok)throw Error('No se pudieron cargar tus perfiles guardados.');return r.json();}
  const prefs=preferences().then(data=>{saved=new Set(data.profiles||[]);ready=true;}).catch(()=>{});
  function avatar(profile){const img=make('img');img.alt='';img.loading='lazy';img.width=52;img.height=52;try{const u=new URL(profile.avatar_url);img.src=u.protocol==='https:'?u.href:'/assets/default-avatar.svg';}catch{img.src='/assets/default-avatar.svg';}img.onerror=()=>{img.onerror=null;img.src='/assets/default-avatar.svg';};return img;}
  function hideQuickSuggestions(){if(!quickBox)return;quickBox.hidden=true;input.setAttribute('aria-expanded','false');clearTimeout(quickTimer);quickController?.abort();quickRevision++;quickLoading=false;}
  function showQuickSuggestions(){if(!quickBox)return;quickBox.hidden=false;input.setAttribute('aria-expanded','true');loadQuickSuggestions();}
  async function loadQuickSuggestions(append=false){
    if(!quickBox)return;
    const rev=++quickRevision;quickController?.abort();quickController=new AbortController();
    if(!append){quickPage=0;suggestedProfiles=[];}quickLoading=true;quickHasMore=false;renderQuickSuggestions();
    try{
      const sb=await window.rccSupabaseReady;
      const {data,error}=await matchingQuery(sb).range(quickPage*8,quickPage*8+8).abortSignal(AbortSignal.any([quickController.signal,AbortSignal.timeout(10000)]));
      if(rev!==quickRevision)return;if(error)throw error;
      quickHasMore=(data||[]).length>8;suggestedProfiles.push(...(data||[]).slice(0,8));quickPage++;quickLoading=false;renderQuickSuggestions();
    }catch{if(rev===quickRevision){quickLoading=false;quickBox.replaceChildren(make('div','No se pudieron cargar los nombres.','wb-profile-suggestion-empty'));const retry=make('button','Reintentar','social-retry');retry.type='button';retry.onclick=()=>loadQuickSuggestions();quickBox.append(retry);}}
  }
  function renderQuickSuggestions(){
    if(!quickBox)return;quickBox.replaceChildren();quickBox.setAttribute('aria-busy',String(quickLoading));
    for(const profile of suggestedProfiles){
      const item=make('button',null,'wb-profile-suggestion');item.type='button';item.setAttribute('role','option');
      item.append(avatar(profile));
      const identity=make('span');identity.append(make('strong',profile.display_name||'Miembro RCC'),make('small',profile.is_creator?'Creador de RCC':profile.show_roblox&&profile.roblox_username?'@'+profile.roblox_username:'Miembro de RCC'));
      item.append(identity);item.onclick=()=>{hideQuickSuggestions();input.value=profile.display_name||profile.roblox_username||'';openProfile(profile);};quickBox.append(item);
    }
    if(quickLoading||!suggestedProfiles.length)quickBox.append(make('div',quickLoading?'Buscando usuarios registrados…':'No hay usuarios con ese nombre.','wb-profile-suggestion-empty'));
    if(quickHasMore){const next=make('button','Cargar más nombres','social-retry');next.type='button';next.onclick=()=>loadQuickSuggestions(true);quickBox.append(next);}
  }
  function openProfile(profile){hideQuickSuggestions();if(typeof window.rccOpenPublicProfile==='function')window.rccOpenPublicProfile(profile);else status.textContent='El perfil se está preparando. Intenta abrirlo de nuevo.';}
  function profileCard(profile,compact=false){const card=make('article',null,compact?'social-suggestion':'social-person-card');const photo=make('button',null,'social-person-photo');photo.type='button';photo.setAttribute('aria-label','Ver perfil de '+(profile.display_name||'Miembro RCC'));photo.append(avatar(profile));photo.onclick=()=>openProfile(profile);
    const identity=make('div',null,'social-person-identity'),name=make('button',profile.display_name||'Miembro RCC','social-person-name');name.type='button';name.onclick=()=>openProfile(profile);identity.append(name);const detail=profile.is_creator?'Creador de RCC':profile.show_roblox&&profile.roblox_username?'@'+profile.roblox_username:'Miembro de RCC';identity.append(make('small',detail));
    const save=make('button',saved.has(profile.user_id)?'Guardado':'Guardar','social-person-save');save.type='button';save.setAttribute('aria-label','Guardar perfil de '+(profile.display_name||'Miembro RCC'));save.setAttribute('aria-pressed',String(saved.has(profile.user_id)));save.dataset.profileSave=profile.user_id;
    save.onclick=async()=>{save.disabled=true;try{const data=await preferences({toggleProfile:profile.user_id});saved=new Set(data.profiles||[]);ready=true;document.querySelectorAll('[data-profile-save]').forEach(b=>{const selected=saved.has(b.dataset.profileSave);b.textContent=selected?'Guardado':'Guardar';b.setAttribute('aria-pressed',String(selected));});if(view==='saved')loadProfiles();}catch{(compact?$('socialSuggestionStatus'):status).textContent='No se pudo guardar el perfil. Inténtalo de nuevo.';}finally{save.disabled=false;}};
    card.append(photo,identity);if(!compact){card.append(make('p',profile.bio||'Un espacio para compartir ideas y descubrir código.','social-person-bio'));const visit=make('button','Ver perfil','social-person-visit');visit.type='button';visit.onclick=()=>openProfile(profile);card.append(visit);}card.append(save);return card;
  }
  const publicQuery=sb=>sb.from('rcc_public_profiles').select(fields);
  async function getSessionId(sb){try{return (await sb.auth.getSession()).data.session?.user?.id;}catch{return null;}}
  function skeleton(target,count){target.replaceChildren(...Array.from({length:count},()=>make('div',null,'social-skeleton')));target.setAttribute('aria-busy','true');}
  async function loadProfiles(append=false){
    const rev=++revision;controller?.abort();controller=new AbortController();const signal=controller.signal;
    if(!append){page=0;skeleton(box,6);}more.hidden=true;more.disabled=true;status.textContent='Buscando personas registradas…';
    try{
      const sb=await window.rccSupabaseReady;let q=matchingQuery(sb);
      if(view==='creator')q=q.eq('is_creator',true);
      if(view==='saved'){
        await prefs;if(!ready){const data=await preferences();saved=new Set(data.profiles||[]);ready=true;}
        if(rev!==revision)return;
        if(!saved.size){box.replaceChildren();status.textContent='Todavía no guardaste perfiles.';return;}
        q=q.in('user_id',[...saved]);
      }
      const {data,error}=await q.range(page*48,page*48+48).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(12000)]));
      if(rev!==revision)return;if(error)throw error;
      const profiles=(data||[]).slice(0,48);if(!append)box.replaceChildren();box.append(...profiles.map(p=>profileCard(p)));page++;
      more.hidden=(data||[]).length<=48;
      status.textContent=box.children.length?'Usuarios registrados · '+box.children.length+(more.hidden?'':' · Hay más perfiles disponibles'):'No encontramos personas con esos filtros.';
    }catch{if(rev===revision){if(!append)box.replaceChildren();else{more.hidden=false;more.textContent='Reintentar cargar más perfiles';}status.textContent='No se pudieron cargar los perfiles. Pulsa Actualizar para reintentar.';}}
    finally{if(rev===revision){box.setAttribute('aria-busy','false');more.disabled=false;}}
  }
  let suggestionPage=0;
  async function suggestions(append=false){
    const rev=++suggestionsRevision,target=$('socialSuggestions'),message=$('socialSuggestionStatus');
    const existingMore=target.querySelector('[data-suggestion-more]');
    if(existingMore)existingMore.remove();
    if(!append){suggestionPage=0;skeleton(target,4);}
    message.textContent=append?'Cargando más sugerencias…':'';
    try{
      const sb=await window.rccSupabaseReady,ownId=await getSessionId(sb);
      let q=publicQuery(sb).order('is_creator',{ascending:false}).order('display_name').order('user_id').range(suggestionPage*20,suggestionPage*20+19);
      if(ownId)q=q.neq('user_id',ownId);
      const {data,error}=await q.abortSignal(AbortSignal.timeout(10000));
      await prefs;if(rev!==suggestionsRevision)return;if(error)throw error;
      const featured=data||[];
      if(!append)target.replaceChildren();
      target.append(...featured.map(profile=>profileCard(profile,true)));
      suggestionPage++;
      if(featured.length===20){
        const moreSuggestions=make('button','Cargar más sugerencias','social-retry');
        moreSuggestions.type='button';moreSuggestions.dataset.suggestionMore='true';
        moreSuggestions.onclick=()=>suggestions(true);target.append(moreSuggestions);
      }
      if(!target.querySelector('.social-suggestion'))message.textContent='Aún no hay otros perfiles para sugerir. Vuelve más tarde.';
      else message.textContent='Puedes cargar más perfiles para descubrir a otras personas.';
    }catch{
      if(rev===suggestionsRevision){
        if(!append)target.replaceChildren();
        const retry=make('button',append?'Reintentar sugerencias':'Reintentar sugerencias','social-retry');
        retry.type='button';retry.onclick=()=>suggestions(append);target.append(retry);
        message.textContent='Las sugerencias no están disponibles en este momento.';
      }
    }finally{if(rev===suggestionsRevision)target.setAttribute('aria-busy','false');}
  }
  function selectView(next){view=next;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));}
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{selectView(b.dataset.view);loadProfiles();});
  input.onfocus=showQuickSuggestions;
  function navigateSuggestions(event){
    if(event.key==='Escape'){input.focus();hideQuickSuggestions();return;}
    if(!['ArrowDown','ArrowUp'].includes(event.key)||quickBox.hidden)return;
    const items=[...quickBox.querySelectorAll('button')];if(!items.length)return;event.preventDefault();
    const current=items.indexOf(document.activeElement),next=event.key==='ArrowDown'?(current+1)%items.length:(current<=0?items.length-1:current-1);items[next].focus();
  }
  input.onkeydown=navigateSuggestions;quickBox?.addEventListener('keydown',navigateSuggestions);
  root.addEventListener('focusout',event=>{if(event.relatedTarget&&!event.relatedTarget.closest('.wb-profile-search'))hideQuickSuggestions();});
  input.oninput=()=>{clearTimeout(timer);clearTimeout(quickTimer);quickController?.abort();quickRevision++;controller?.abort();revision++;quickBox.hidden=false;input.setAttribute('aria-expanded','true');suggestedProfiles=[];quickLoading=true;renderQuickSuggestions();quickTimer=setTimeout(()=>loadQuickSuggestions(),220);timer=setTimeout(()=>loadProfiles(),280);};
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.wb-profile-search'))hideQuickSuggestions();});
  $('wbRefresh').onclick=()=>{loadProfiles();suggestions();if(quickBox&&!quickBox.hidden)loadQuickSuggestions();};
  function open(query=''){document.body.classList.add('social-people');document.querySelectorAll('.social-nav-items button').forEach(b=>b.setAttribute('aria-current',b.dataset.socialNav==='people'?'page':'false'));input.value=query;selectView('all');window.scrollTo({top:0,behavior:'instant'});loadProfiles();input.focus({preventScroll:true});}
  window.RCCPeople={open,refresh:()=>{loadProfiles();suggestions();if(quickBox&&!quickBox.hidden)loadQuickSuggestions();}};
  $('wbCommunity').onclick=()=>open();
  suggestions();
  window.addEventListener('focus',()=>{suggestions();if(quickBox&&!quickBox.hidden)loadQuickSuggestions();if(document.body.classList.contains('social-people'))loadProfiles();});
  setInterval(()=>{if(!document.hidden){suggestions();if(quickBox&&!quickBox.hidden)loadQuickSuggestions();if(document.body.classList.contains('social-people'))loadProfiles();}},60000);
})();
