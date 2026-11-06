/* Autenticación, comentarios y perfiles usando Supabase directamente. */
const APP_VERSION = '2.0';
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
      color.value = data?.text_color || '#dce6f5';
      profile.status.textContent='';
    } catch(error) { profile.status.textContent = error.message || 'Error al cargar perfil.'; }
    finally { saveProfile.disabled=false; }
  };

  profile.form.onsubmit=async event=>{
    event.preventDefault();
    if(currentUser?.id !== profileOwner){ profile.status.textContent='La sesión cambió. Abre tu perfil de nuevo.'; return; }
    saveProfile.disabled=true;
    try {
      if(avatar.value && new URL(avatar.value).protocol!=='https:') throw new Error('Usa una URL HTTPS para tu foto.');
      const sb = await window.rccSupabaseReady;
      const { error } = await sb.from('profiles').upsert({
        user_id: currentUser.id,
        display_name: name.value.trim(),
        avatar_url: avatar.value.trim(),
        text_color: color.value
      });
      if(error) throw error;
      profile.status.textContent='Perfil guardado.';
      if(section?.isConnected) loadComments(section, scriptId);
    } catch(error) { profile.status.textContent = error.message || 'Error al guardar.'; }
    finally { saveProfile.disabled=false; }
  };

  // --- 3. COMENTARIOS ---
  let section=null, scriptId=null, loadRevision=0;
  
  window.rccRefreshCopy=()=>{ const button=document.getElementById('scriptCopyBtn'); if(button) button.textContent = (window.rccRequiresLogin && !currentUser) ? 'Inicia sesión para copiar' : 'Copiar código'; };
  window.rccRefreshComposer=()=>{ if(!section?.isConnected) return; const form=section.querySelector('form'); form.hidden=!currentUser; section.querySelector('.comment-login').hidden=!!currentUser; };

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
        const { data: profs } = await sb.from('profiles').select('*').in('user_id', userIds);
        if(profs) profs.forEach(p => profiles[p.user_id] = p);
      }

      list.replaceChildren();
      if(!comments.length) list.textContent='Aún no hay comentarios. Comparte el primero.';
      
      for(const row of comments){
        const article=el('article'), person=el('div',null,'comment-person');
        const prof = profiles[row.user_id] || {};
        
        if(prof.avatar_url && /^https:\/\//i.test(prof.avatar_url)){
          const image=el('img'); image.src=prof.avatar_url; image.alt=''; image.loading='lazy'; image.referrerPolicy='no-referrer'; image.onerror=()=>image.remove(); person.append(image);
        }
        
        const authorName = prof.display_name || row.user_email.split('@')[0];
        const authorColor = prof.text_color || '#dce6f5';
        
        const author=el('strong', authorName); 
        if(/^#[a-f0-9]{6}$/i.test(authorColor)) author.style.color = authorColor;
        person.append(author);
        
        const date=el('time',new Date(row.created_at).toLocaleString('es')); date.dateTime=row.created_at;
        article.append(person, date, el('p', row.text));
        list.append(article);
      }
    } catch(error) {
      if(revision!==loadRevision || !target.isConnected) return;
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
    form.append(input,send,status); target.append(form); modalBody.append(target);
    
    form.onsubmit=async event=>{
      event.preventDefault(); send.disabled=true; status.textContent='Publicando…';
      try {
        const sb = await window.rccSupabaseReady;
        const { error } = await sb.from('comments').insert({
          script_id: String(id),
          user_id: currentUser.id,
          user_email: currentUser.email,
          text: input.value
        });
        if(error) throw error;
        input.value=''; status.textContent='Comentario publicado.'; await loadComments(target,id);
      } catch(error) { status.textContent = error.message || 'Error al publicar.'; }
      finally { send.disabled=false; }
    };
    window.rccRefreshComposer(); loadComments(target,id);
  };

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
