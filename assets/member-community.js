/* Perfiles, autenticación de recuperación y comentarios mediante Supabase directo. */
const APP_VERSION = '3.0';
(() => {
  const el = (tag, text, cls) => {const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  
  function dialog(title) {
    const d=el('dialog',null,'member-dialog');d.setAttribute('aria-label',title);
    d.append(el('h2',title));const form=el('form');d.append(form);
    const status=el('p',null,'member-status');status.setAttribute('role','status');
    const close=el('button','Cerrar','btn btn-ghost');close.type='button';close.onclick=()=>d.close();
    form.append(status,close);document.body.append(d);return {d,form,status,close};
  }
  function field(form,label,type,options={}) {
    const wrapper=el('label',label),input=el('input');input.type=type;Object.assign(input,options);wrapper.append(input);form.prepend(wrapper);return input;
  }

  // --- 1. RECUPERACIÓN DE CONTRASEÑA ---
  const recovery=dialog('Restablecer contraseña');
  const password=field(recovery.form,'Nueva contraseña','password',{required:true,minLength:8,maxLength:128,autocomplete:'new-password'});
  const savePassword=el('button','Guardar','btn btn-primary');savePassword.type='submit';recovery.status.before(savePassword);
  window.rccOpenRecovery=()=>{ if(typeof closeAuth==='function') closeAuth(); recovery.status.textContent=''; if(!recovery.d.open) recovery.d.showModal(); password.focus(); };
  recovery.form.onsubmit=async event=>{
    event.preventDefault(); savePassword.disabled=true;
    try {
      const sb = await window.rccSupabaseReady;
      const {error} = await sb.auth.updateUser({password:password.value});
      if(error) throw error;
      password.value=''; recovery.status.textContent='Contraseña actualizada correctamente.'; 
      if(typeof showToast==='function') showToast('Contraseña actualizada correctamente.');
    } catch(error) { recovery.status.textContent=error.message || 'Error al actualizar.'; }
    finally { savePassword.disabled=false; }
  };

  // --- 2. PERFILES DE USUARIO ---
  const profile=dialog('Tu perfil');
  const color=field(profile.form,'Color del nombre','color',{value:'#dce6f5',required:true});
  const avatar=field(profile.form,'Foto · URL HTTPS','url',{maxLength:2000,placeholder:'https://…'});
  const name=field(profile.form,'Nombre visible','text',{required:true,maxLength:80});
  const robloxUsername=field(profile.form,'Usuario de Roblox','text',{maxLength:20,placeholder:'Ej. Builderman',autocomplete:'off',spellcheck:false});
  const robloxHint=el('small','Opcional. Si lo completas, se usará la foto de tu avatar de Roblox.','member-hint');
  robloxUsername.parentElement.append(robloxHint);
  name.parentElement.after(robloxUsername.parentElement);
  const bannerUpload=field(profile.form,'Banner de perfil · imagen','file',{accept:'image/png,image/jpeg,image/webp',});
  const bannerPreview=el('div',null,'profile-banner-preview');
  bannerUpload.parentElement.after(bannerPreview);
  let currentBannerUrl='';
  bannerUpload.addEventListener('change',()=>{const file=bannerUpload.files?.[0];if(!file)return;if(file.size>5*1024*1024){bannerUpload.value='';profile.status.textContent='El banner debe pesar menos de 5 MB.';return;}if(!/^image\/(png|jpeg|webp)$/.test(file.type)){bannerUpload.value='';profile.status.textContent='Usa una imagen PNG, JPG o WEBP.';return;}const local=URL.createObjectURL(file);bannerPreview.style.backgroundImage='url("'+local+'")';});
  const saveProfile=el('button','Guardar perfil','btn btn-primary');saveProfile.type='submit';profile.status.before(saveProfile);
  
  let profileOwner=null;
  document.getElementById('authEmail').onclick=async()=>{
    if(!currentUser) return;
    profileOwner=currentUser.id; profile.form.reset(); profile.status.textContent='Cargando perfil…'; saveProfile.disabled=true; profile.d.showModal();
    try {
      const sb = await window.rccSupabaseReady;
      const { data, error } = await sb.from('profiles').select('*').eq('user_id', currentUser.id).maybeSingle();
      if(error) throw error;
      if(currentUser?.id !== profileOwner){ profile.d.close(); return; }
      name.value = data?.display_name || '';
      avatar.value = data?.avatar_url || '';
      currentBannerUrl=data?.banner_url||'';bannerPreview.style.backgroundImage=currentBannerUrl?'url("'+currentBannerUrl+'")':'';
      robloxUsername.value = data?.roblox_username || '';window.rccHasRobloxLink=!!data?.roblox_username;
      color.value = data?.text_color || '#dce6f5';
      profile.status.textContent='';
    } catch(error) { profile.status.textContent = error.message || 'Error al cargar perfil.'; }
    finally { saveProfile.disabled=false; }
  };

  profile.form.onsubmit=async event=>{
    event.preventDefault();
    if(currentUser?.id !== profileOwner){ profile.status.textContent='La sesión cambió. Abre tu perfil de nuevo.'; return; }
    saveProfile.disabled=true;
    const defaultAvatarUrl=new URL('/assets/default-avatar.svg',window.location.origin).href;
    let avatarUrl=avatar.value.trim() || defaultAvatarUrl;
    let robloxWarning='';
    try {
      const username=robloxUsername.value.trim().replace(/^@/,'');
      if(username){
        profile.status.textContent='Buscando el avatar de Roblox…';
        try {
          const response=await fetch('/api/roblox-avatar',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({username}),
            signal:AbortSignal.timeout(18000)
          });
          const result=await response.json().catch(()=>({}));
          if(!response.ok || typeof result.avatarUrl!=='string' || !/^https:\/\//i.test(result.avatarUrl)){
            throw new Error(result.error || 'No se pudo encontrar ese usuario de Roblox.');
          }
          avatarUrl=result.avatarUrl;
        } catch {
          avatarUrl=defaultAvatarUrl;
          robloxWarning='No encontramos ese usuario de Roblox o el servicio no respondió. Se guardó tu perfil con la foto predeterminada.';
        }
      } else if(avatarUrl && new URL(avatarUrl).protocol!=='https:') {
        throw new Error('Usa una URL HTTPS para tu foto.');
      }
      if(currentUser?.id !== profileOwner){ profile.status.textContent='La sesión cambió. Abre tu perfil de nuevo.'; return; }
      const sb = await window.rccSupabaseReady;
      const { error } = await sb.from('profiles').upsert({
        user_id: currentUser.id,
        display_name: name.value.trim(),
        avatar_url: avatarUrl,
        banner_url: currentBannerUrl,
        roblox_username: username || robloxUsername.value.trim(),
        text_color: color.value
      });
      if(error) throw error;
      const bannerFile=bannerUpload.files?.[0];
      if(bannerFile){
        profile.status.textContent='Subiendo banner…';
        const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' })[bannerFile.type];
        const sb2=await window.rccSupabaseReady;
        const path=currentUser.id+'/banners/'+crypto.randomUUID()+'.'+ext;
        const {data:uploaded,error:uploadError}=await sb2.storage.from('profile-media').upload(path,bannerFile,{upsert:false,contentType:bannerFile.type,cacheControl:'3600'});
        if(uploadError)throw uploadError;
        const {data:publicData}=sb2.storage.from('profile-media').getPublicUrl(uploaded.path);
        currentBannerUrl=publicData.publicUrl;
        const {error:updateError}=await sb2.from('profiles').update({banner_url:currentBannerUrl}).eq('user_id',currentUser.id);
        if(updateError)throw updateError;
        bannerUpload.value='';
      }
      window.rccHasRobloxLink=!!(username||robloxUsername.value.trim());
      profile.status.textContent=robloxWarning || 'Perfil guardado.';
      if(section?.isConnected) loadComments(section, scriptId);
    } catch(error) { profile.status.textContent = error.message || 'Error al guardar.'; }
    finally { saveProfile.disabled=false; }
  };

  // --- 3. COMENTARIOS ---
  let section=null, scriptId=null, loadRevision=0;
  const creatorEmail='drillbobhii@gmail.com';
  const publicProfile=dialog('Perfil RCC');publicProfile.d.classList.add('rcc-profile-dialog');publicProfile.form.hidden=true;const publicClose=el('button','×','close');publicClose.type='button';publicClose.setAttribute('aria-label','Cerrar perfil');publicClose.onclick=()=>publicProfile.d.close();publicProfile.d.append(publicClose);
  const publicBanner=el('div',null,'rcc-profile-banner'),publicContent=el('div',null,'rcc-profile-content');
  const publicAvatar=el('img',null,'rcc-profile-avatar');publicAvatar.alt='Foto de perfil';
  const publicName=el('div',null,'rcc-profile-name'),publicRoblox=el('div',null,'rcc-profile-roblox'),publicFounder=el('div','👑 RCC FOUNDER · DRILLBOBHII','rcc-founder-mark');
  publicContent.append(publicAvatar,publicName,publicRoblox,publicFounder);publicProfile.d.insertBefore(publicBanner,publicProfile.d.firstChild);publicProfile.d.insertBefore(publicContent,publicProfile.form);
  function openPublicProfile(profileData={},isCreator=false){
    publicName.textContent=profileData.display_name||'Miembro RCC';
    publicAvatar.src=profileData.avatar_url||new URL('/assets/default-avatar.svg',location.origin).href;
    publicRoblox.textContent=profileData.roblox_username?'Roblox: @'+profileData.roblox_username:'Cuenta de Roblox no vinculada';
    publicBanner.style.backgroundImage=profileData.banner_url?'url("'+profileData.banner_url.replace(/["\\\\]/g,'')+'")':'';
    publicBanner.classList.toggle('creator',isCreator);publicFounder.hidden=!isCreator;
    publicProfile.d.querySelector('h2').textContent=isCreator?'Perfil del creador RCC':'Perfil de la comunidad';
    publicProfile.status.textContent='';if(!publicProfile.d.open)publicProfile.d.showModal();
  }
  window.rccHasRobloxLink=false;

  
  window.rccRefreshCopy=()=>{ const button=document.getElementById('scriptCopyBtn'); if(button) button.textContent = (window.rccRequiresLogin && !currentUser) ? 'Inicia sesión para copiar' : 'Copiar código'; };
  window.rccRefreshComposer=()=>{ if(!section?.isConnected) return; const form=section.querySelector('form'); form.hidden=!currentUser; if(!currentUser) section.cancelReply(); section.querySelector('.comment-login').hidden=!!currentUser; };
  window.addEventListener('rcc:session',()=>{window.rccRefreshComposer();if(section?.isConnected)loadComments(section,scriptId);});

  async function loadComments(target, id){
    const revision=++loadRevision, list=target.querySelector('.comment-list'); list.textContent='Cargando comentarios…';
    try {
      const sb = await window.rccSupabaseReady;
      // 1. Traer comentarios
      const { data: comments, error: cError } = await sb.from('comments').select('*').eq('script_id', String(id)).order('created_at', { ascending: false });
      if(cError) throw cError;
      if(revision!==loadRevision || !target.isConnected) return;
      
      // 2. Traer perfiles de los usuarios que comentaron
      const userIds = [...new Set(comments.map(c => c.user_id))];
      let profiles = {};
      if(userIds.length > 0) {
        const { data: profs } = await sb.from('profiles').select('user_id,display_name,avatar_url,banner_url,roblox_username,text_color').in('user_id', userIds);
        if(profs) profs.forEach(p => profiles[p.user_id] = p);
      }

      if(revision!==loadRevision || !target.isConnected) return;
      window.RCCScriptReview?.comments(id, comments);
      list.replaceChildren();
      if(!comments.length) list.textContent='Aún no hay comentarios. Comparte el primero.';
      
      // Recorrer cada hilo sin perder comentarios huérfanos o ciclos malformados.
      const children=new Map(), ids=new Set(comments.map(row=>String(row.id)));
      for(const row of comments){
        const key=row.parent_id == null ? null : String(row.parent_id);
        if(!children.has(key)) children.set(key,[]);
        children.get(key).push(row);
      }
      const ordered=[], visited=new Set();
      const visit=root=>{
        const pending=[root];
        while(pending.length){
          const row=pending.pop(), key=String(row.id);
          if(visited.has(key)) continue;
          visited.add(key); ordered.push(row);
          pending.push(...(children.get(key)||[]).slice().reverse());
        }
      };
      comments.filter(row=>row.parent_id == null || !ids.has(String(row.parent_id))).forEach(visit);
      comments.forEach(visit);
      for(const row of ordered){
        const article=el('article'), person=el('div',null,'comment-person');
        if(row.parent_id != null) article.classList.add('comment-reply');
        const prof = profiles[row.user_id] || {};
        
        if(prof.avatar_url && /^https:\/\//i.test(prof.avatar_url)){
          const image=el('img'); image.src=prof.avatar_url; image.alt=''; image.loading='lazy'; image.referrerPolicy='no-referrer'; image.onerror=()=>image.remove(); person.append(image);
        }
        
        const authorName = prof.display_name || (row.user_email || 'Miembro').split('@')[0];
        const authorColor = prof.text_color || '#dce6f5';
        
        const isCreator=(row.user_email||'').trim().toLowerCase()===creatorEmail;
        const author=el('button',authorName,'comment-author-button');author.type='button';
        if(/^#[a-f0-9]{6}$/i.test(authorColor)) author.style.color = authorColor;
        author.onclick=()=>openPublicProfile(prof,isCreator);
        person.append(author);
        if(prof.banner_url){person.style.backgroundImage='linear-gradient(90deg,rgba(8,12,20,.86),rgba(8,12,20,.55)),url("'+String(prof.banner_url).replace(/["\\\\]/g,'')+'")';person.style.backgroundSize='cover';person.style.backgroundPosition='center';person.style.padding='10px 12px';person.style.borderRadius='12px';}
        if(isCreator){
          person.classList.add('comment-founder-person');
          if(!prof.banner_url){person.style.background='linear-gradient(110deg,#4b3518,#141b2c 70%)';person.style.padding='10px 12px';person.style.borderRadius='12px';}
          person.append(el('span','👑 RCC FOUNDER','comment-creator-badge'));
          article.classList.add('comment-creator');
        }
        
        const date=el('time',new Date(row.created_at).toLocaleString('es')); date.dateTime=row.created_at;
        const reply=el('button','Responder','btn btn-ghost comment-reply-button'); reply.type='button';
        reply.onclick=()=>target.startReply(row.id,authorName);
        const message=el('p',row.text),actions=el('div',null,'comment-actions');
        actions.append(reply);
        if(currentUser?.id===row.user_id){
          const edit=el('button','Editar','btn btn-ghost comment-edit-button');
          edit.type='button';
          edit.onclick=()=>{
            if(article.querySelector('.comment-edit-form'))return;
            const form=el('form',null,'comment-edit-form'),editor=el('textarea'),status=el('p');
            editor.value=row.text;editor.required=true;editor.maxLength=2000;editor.setAttribute('aria-label','Editar comentario');
            const save=el('button','Guardar cambios','btn btn-primary'),cancel=el('button','Cancelar','btn btn-ghost');
            save.type='submit';cancel.type='button';cancel.onclick=()=>form.remove();
            form.append(editor,save,cancel,status);article.append(form);editor.focus();
            form.onsubmit=async event=>{
              event.preventDefault();const text=editor.value.trim();if(!text)return;
              save.disabled=true;status.textContent='Guardando…';
              try{const sb=await window.rccSupabaseReady;const {error}=await sb.from('comments').update({text}).eq('id',row.id).eq('user_id',currentUser.id);if(error)throw error;await loadComments(target,id);}
              catch(error){status.textContent=error.message||'No se pudo editar el comentario.';save.disabled=false;}
            };
          };
          const remove=el('button','Eliminar','btn btn-ghost comment-delete-button');
          remove.type='button';
          remove.onclick=async()=>{
            if(!window.confirm('¿Eliminar este comentario?'))return;
            remove.disabled=true;
            try{const sb=await window.rccSupabaseReady;const {error}=await sb.from('comments').delete().eq('id',row.id).eq('user_id',currentUser.id);if(error)throw error;await loadComments(target,id);}
            catch(error){remove.disabled=false;window.alert(error.message||'No se pudo eliminar el comentario.');}
          };
          actions.append(edit,remove);
        }
        article.append(person,date,message,actions);
        list.append(article);
      }
    } catch(error) {
      if(revision!==loadRevision || !target.isConnected) return;
      window.RCCScriptReview?.commentsUnavailable(id);
      list.textContent = error.message || 'Error al cargar comentarios.';
      const retry=el('button','Reintentar','btn btn-ghost'); retry.onclick=()=>loadComments(target,id); list.append(retry);
    }
  }

  window.rccMountComments=id=>{
    scriptId=id; const target=section=el('section',null,'script-comments'); target.append(el('h3','Comentarios'));
    const list=el('div',null,'comment-list'); list.setAttribute('aria-live','polite'); target.append(list);
    
    const login=el('button','Inicia sesión para comentar','btn btn-ghost comment-login'); 
    login.onclick = typeof openAuth === 'function' ? openAuth : () => {}; 
    target.append(login);
    
    const form=el('form'), input=el('textarea'); input.required=true; input.maxLength=2000; input.setAttribute('aria-label','Tu comentario'); input.placeholder='Comparte tu experiencia…';
    const send=el('button','Publicar comentario','btn btn-primary'); send.type='submit';
    const status=el('p'); status.setAttribute('role','status');
    let parentId=null;
    const replyContext=el('div',null,'comment-reply-context'), replyLabel=el('span'); replyContext.hidden=true;
    const cancel=el('button','Cancelar respuesta','btn btn-ghost'); cancel.type='button';
    target.cancelReply=()=>{ parentId=null; replyContext.hidden=true; replyLabel.textContent=''; send.textContent='Publicar comentario'; };
    cancel.onclick=target.cancelReply;
    target.startReply=(id,authorName)=>{
      if(send.disabled) return;
      if(!currentUser){ login.click(); return; }
      parentId=id; replyLabel.textContent=`Respondiendo a ${authorName}`; replyContext.hidden=false;
      send.textContent='Publicar respuesta'; form.hidden=false; status.textContent='';
      input.focus(); form.scrollIntoView({block:'nearest',behavior:'smooth'});
    };
    replyContext.append(replyLabel,cancel);
    form.append(replyContext,input,send,status); target.append(form); modalBody.append(target);
    
    form.onsubmit=async event=>{
      event.preventDefault(); send.disabled=true; status.textContent='Publicando…';
      try {
        if(!currentUser) throw new Error('Inicia sesión para comentar.');
        const sb = await window.rccSupabaseReady;
        if(!currentUser) throw new Error('Inicia sesión para comentar.');
        const { error } = await sb.from('comments').insert({
          script_id: String(id),
          user_id: currentUser.id,
          user_email: currentUser.email,
          text: input.value,
          parent_id: parentId
        });
        if(error) throw error;
        input.value=''; target.cancelReply(); status.textContent='Comentario publicado.'; await loadComments(target,id);
      } catch(error) { status.textContent = error.message || 'Error al publicar.'; }
      finally { send.disabled=false; }
    };
    window.rccRefreshComposer(); loadComments(target,id);
  };

  // Read-only notification feed. The existing tables remain the source of truth.
  function startNotificationFeed() {
    let owner=null, revision=0, running=false, refreshPending=false;
    const seen=new Map();
    const emit=(items,status='')=>window.dispatchEvent(new CustomEvent('rcc:notifications-update',{detail:{items,status}}));
    async function poll() {
      if(!owner || document.hidden) return;
      if(running){refreshPending=true;return;}
      running=true;
      const userId=owner, token=revision;
      const valid=()=>token===revision && currentUser?.id===userId;
      try {
        const sb=await window.rccSupabaseReady;
        if(!valid())return;
        const mine=[];
        for(let offset=0;;offset+=500){
          const result=await sb.from('comments').select('id,script_id').eq('user_id',userId).order('id').range(offset,offset+499).abortSignal(AbortSignal.timeout(8000));
          if(result.error)throw result.error;
          if(!valid())return;
          mine.push(...(result.data||[]));
          if((result.data||[]).length<500)break;
        }
        if(!mine.length){emit([]);return;}
        const own=new Map(mine.map(row=>[String(row.id),row]));
        const since=new Date(Date.now()-86400000).toISOString();
        const rows=[], warnings=new Set();
        for(let offset=0;offset<mine.length;offset+=100){
          const ids=mine.slice(offset,offset+100).map(row=>row.id);
          const results=await Promise.all([
            sb.from('comments').select('id,parent_id,script_id,user_id,text,created_at').in('parent_id',ids).neq('user_id',userId).gte('created_at',since).order('created_at',{ascending:false}).limit(100).abortSignal(AbortSignal.timeout(8000)),
            sb.from('comment_likes').select('comment_id,user_id,created_at').in('comment_id',ids).neq('user_id',userId).gte('created_at',since).order('created_at',{ascending:false}).limit(100).abortSignal(AbortSignal.timeout(8000))
          ]);
          if(!valid())return;
          results.forEach((result,index)=>{
            if(result.error){warnings.add(index?'No se pudieron consultar los Me gusta.':'No se pudieron consultar las respuestas.');return;}
            for(const row of result.data||[]){
              const script=own.get(String(index?row.comment_id:row.parent_id));
              if(!script || !Number.isFinite(Date.parse(row.created_at)))continue;
              rows.push({id:index?`like:${row.comment_id}:${row.user_id}:${row.created_at}`:`reply:${row.id}`,type:index?'like':'reply',scriptId:String(script.script_id),actor:row.user_id,text:row.text||'',createdAt:row.created_at});
            }
          });
        }
        rows.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.id.localeCompare(b.id));
        const recent=rows.slice(0,100), profiles=new Map();
        const actors=[...new Set(recent.map(row=>row.actor))];
        if(actors.length){
          const result=await sb.from('profiles').select('user_id,display_name').in('user_id',actors).abortSignal(AbortSignal.timeout(8000));
          for(const profile of result.data||[])profiles.set(profile.user_id,profile.display_name);
        }
        if(!valid())return;
        const items=recent.map(row=>({...row,message:row.type==='like'?`A ${profiles.get(row.actor)||'un miembro'} le gustó tu comentario`:`${profiles.get(row.actor)||'Un miembro'} respondió a tu comentario: ${row.text}`}));
        emit(items,[...warnings].join(' '));
        // Only recent arrivals produce banners; older records remain in the bell panel.
        for(const item of items.slice().reverse()){
          if(!seen.has(item.id) && Date.parse(item.createdAt)>=Date.now()-300000){
            window.dispatchEvent(new CustomEvent('rcc:notification',{detail:item}));
          }
          seen.set(item.id,Date.parse(item.createdAt));
        }
        for(const [id,time] of seen)if(time<Date.now()-86400000)seen.delete(id);
      } catch {
        if(valid())window.dispatchEvent(new CustomEvent('rcc:notifications-error',{detail:{message:'No se pudieron actualizar las notificaciones. Se reintentará automáticamente.'}}));
      } finally {
        running=false;
        if(refreshPending){refreshPending=false;poll();}
      }
    }
    function sync(){
      const next=currentUser?.id||null;
      if(next===owner)return;
      owner=next;revision++;seen.clear();window.dispatchEvent(new Event('rcc:notifications-reset'));emit([]);
      if(owner)poll();
    }
    new MutationObserver(sync).observe(document.getElementById('authEmail'),{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});
    setInterval(poll,3000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});
    window.addEventListener('rcc:notifications-refresh',poll);
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startNotificationFeed,{once:true});
  else startNotificationFeed();

  // --- 4. AVISO DE VERSIÓN ---
  try{
    const previous=localStorage.getItem('APP_VERSION');
    if(previous && Number(previous)<Number(APP_VERSION)){
      const update=dialog('¡Nueva actualización disponible!');
      const reload=el('button','Recargar','btn btn-primary'); reload.type='button'; reload.onclick=()=>{localStorage.setItem('APP_VERSION',APP_VERSION);location.reload();};
      update.form.prepend(reload); update.d.showModal();
    } else {
      localStorage.setItem('APP_VERSION',APP_VERSION);
    }
  }catch{}
})();
