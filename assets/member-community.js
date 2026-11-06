/* Authentication stays with Supabase; persistent community data uses Netlify Database. */
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
  const recovery=dialog('Restablecer contraseña');
  const password=field(recovery.form,'Nueva contraseña','password',{required:true,minLength:8,maxLength:128,autocomplete:'new-password'});
  const savePassword=el('button','Guardar','btn btn-primary');savePassword.type='submit';recovery.status.before(savePassword);
  window.rccOpenRecovery=()=>{closeAuth();recovery.status.textContent='';if(!recovery.d.open)recovery.d.showModal();password.focus();};
  recovery.form.onsubmit=async event=>{event.preventDefault();savePassword.disabled=true;
    try {const {error}=await (await window.rccSupabaseReady).auth.updateUser({password:password.value});if(error)throw error;password.value='';recovery.status.textContent='Contraseña actualizada correctamente.';showToast('Contraseña actualizada correctamente.');}
    catch(error){recovery.status.textContent=cloudError(error);}finally{savePassword.disabled=false;}
  };
  async function api(action,method='GET',body) {
    const headers={};
    if(method!=='GET'||action==='action=profile'){
      const {data,error}=await (await window.rccSupabaseReady).auth.getSession();if(error)throw error;
      if(!data.session)throw new Error('Inicia sesión para continuar.');
      headers.Authorization='Bearer '+data.session.access_token;
      headers['x-supabase-key']=document.querySelector('meta[name="supabase-anon-key"]').content;
    }
    if(body)headers['Content-Type']='application/json';
    const response=await fetch('/.netlify/functions/member-community?'+action,{method,headers,body:body?JSON.stringify(body):undefined});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo completar la operación.');return result;
  }
  const profile=dialog('Tu perfil');
  const color=field(profile.form,'Color del nombre','color',{value:'#dce6f5',required:true});
  const avatar=field(profile.form,'Foto · URL HTTPS','url',{maxLength:2000,placeholder:'https://…'});
  const name=field(profile.form,'Nombre visible','text',{required:true,maxLength:80});
  const saveProfile=el('button','Guardar perfil','btn btn-primary');saveProfile.type='submit';profile.status.before(saveProfile);
  let profileOwner=null;
  document.getElementById('authEmail').onclick=async()=>{
    if(!currentUser)return;profileOwner=currentUser.id;profile.form.reset();profile.status.textContent='Cargando perfil…';saveProfile.disabled=true;profile.d.showModal();
    try{const data=await api('action=profile');if(currentUser?.id!==profileOwner){profile.d.close();return;}name.value=data.profile?.display_name||'';avatar.value=data.profile?.avatar_url||'';color.value=data.profile?.text_color||'#dce6f5';profile.status.textContent='';}
    catch(error){profile.status.textContent=cloudError(error);}finally{saveProfile.disabled=false;}
  };
  profile.form.onsubmit=async event=>{event.preventDefault();if(currentUser?.id!==profileOwner){profile.status.textContent='La sesión cambió. Abre tu perfil de nuevo.';return;}saveProfile.disabled=true;
    try{if(avatar.value && new URL(avatar.value).protocol!=='https:')throw new Error('Usa una URL HTTPS para tu foto.');await api('action=profile','PUT',{display_name:name.value.trim(),avatar_url:avatar.value.trim(),text_color:color.value});profile.status.textContent='Perfil guardado.';if(section?.isConnected)loadComments(section,scriptId);}
    catch(error){profile.status.textContent=cloudError(error);}finally{saveProfile.disabled=false;}
  };
  let section=null,scriptId=null,loadRevision=0;
  window.rccRefreshCopy=()=>{const button=document.getElementById('scriptCopyBtn');if(button)button.textContent=window.rccRequiresLogin&&!currentUser?'Inicia sesión para copiar':'Copiar código';};
  window.rccRefreshComposer=()=>{if(!section?.isConnected)return;const form=section.querySelector('form');form.hidden=!currentUser;section.querySelector('.comment-login').hidden=!!currentUser;};
  async function loadComments(target,id){
    const revision=++loadRevision,list=target.querySelector('.comment-list');list.textContent='Cargando comentarios…';
    try{const result=await api('script='+encodeURIComponent(id));if(revision!==loadRevision||!target.isConnected)return;list.replaceChildren();
      if(!result.comments.length)list.textContent='Aún no hay comentarios. Comparte el primero.';
      for(const row of result.comments){const article=el('article'),person=el('div',null,'comment-person');
        if(row.avatar_url && /^https:\/\//i.test(row.avatar_url)){const image=el('img');image.src=row.avatar_url;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();person.append(image);}
        const author=el('strong',row.display_name);if(/^#[a-f0-9]{6}$/i.test(row.text_color))author.style.color=row.text_color;person.append(author);
        const date=el('time',new Date(row.created_at).toLocaleString('es'));date.dateTime=row.created_at;article.append(person,date,el('p',row.text));list.append(article);
      }
    }catch(error){if(revision!==loadRevision||!target.isConnected)return;list.textContent=cloudError(error);const retry=el('button','Reintentar','btn btn-ghost');retry.onclick=()=>loadComments(target,id);list.append(retry);}
  }
  window.rccMountComments=id=>{
    scriptId=id;const target=section=el('section',null,'script-comments');target.append(el('h3','Comentarios'));
    const list=el('div',null,'comment-list');list.setAttribute('aria-live','polite');target.append(list);
    const login=el('button','Inicia sesión para comentar','btn btn-ghost comment-login');login.onclick=openAuth;target.append(login);
    const form=el('form'),input=el('textarea');input.required=true;input.maxLength=2000;input.setAttribute('aria-label','Tu comentario');input.placeholder='Comparte tu experiencia…';
    const send=el('button','Publicar comentario','btn btn-primary');send.type='submit';const status=el('p');status.setAttribute('role','status');form.append(input,send,status);target.append(form);modalBody.append(target);
    form.onsubmit=async event=>{event.preventDefault();send.disabled=true;status.textContent='Publicando…';try{await api('script='+encodeURIComponent(id),'POST',{text:input.value});input.value='';status.textContent='Comentario publicado.';await loadComments(target,id);}catch(error){status.textContent=cloudError(error);}finally{send.disabled=false;}};
    window.rccRefreshComposer();loadComments(target,id);
  };
  try{
    const previous=localStorage.getItem('APP_VERSION');
    if(previous && Number(previous)<Number(APP_VERSION)){
      const update=dialog('¡Nueva actualización disponible!');const reload=el('button','Recargar','btn btn-primary');reload.type='button';reload.onclick=()=>{localStorage.setItem('APP_VERSION',APP_VERSION);location.reload();};update.form.prepend(reload);update.d.showModal();
    }else localStorage.setItem('APP_VERSION',APP_VERSION);
  }catch{}
})();
