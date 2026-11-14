/* Identity for new accounts, with existing account login retained. */
window.rccLegacyReady = window.rccSupabaseReady;
window.rccIdentityReady = import('https://esm.sh/@netlify/identity@2.0.0?bundle');
window.rccMemberAPI = async (action, options={}) => {
  const params=new URLSearchParams({action,...options.params});
  const headers={'Content-Type':'application/json'};
  const identity=await window.rccIdentityReady;
  if(!await identity.getUser()){
    const legacy=await window.rccLegacyReady;
    const {data}=await legacy.auth.getSession();
    if(data.session?.access_token){headers.Authorization='Bearer '+data.session.access_token;headers['x-supabase-key']=document.querySelector('meta[name="supabase-anon-key"]').content.trim();}
  }
  const response=await fetch('/api/members?'+params,{method:options.method||'GET',headers,credentials:'same-origin',...(options.body?{body:JSON.stringify(options.body)}:{})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo completar la operación.');return data;
};
window.rccSupabaseReady=Promise.all([window.rccIdentityReady,window.rccLegacyReady]).then(async([identity,legacy])=>{
  const wrap=async(fn)=>{try{return await fn();}catch(error){return {data:{},error};}};
  const session=async()=>{const user=await identity.getUser();return user?{data:{session:{user}}}:legacy.auth.getSession();};
  const auth={
    getSession:session,
    signInWithPassword:({email,password})=>wrap(async()=>{try{const user=await identity.login(email,password);return {data:{session:{user}}};}catch{return legacy.auth.signInWithPassword({email,password});}}),
    signUp:({email,password})=>wrap(async()=>{
      const query=document.getElementById('signupRoblox').value.trim();
      if(!query)throw Error('Busca tu usuario de Roblox por nombre o ID antes de registrarte.');
      const {roblox}=await window.rccMemberAPI('roblox',{params:{q:query}});
      await identity.signup(email,password,{full_name:roblox.displayName,roblox_id:roblox.id,roblox_username:roblox.name,avatar_url:roblox.avatarUrl});
      const user=await identity.getUser();return {data:{user,session:user?{user}:null}};
    }),
    signOut:()=>wrap(async()=>{await identity.logout();await legacy.auth.signOut();return {error:null};}),
    updateUser:({password})=>wrap(async()=>{if(await identity.getUser()){await identity.updateUser({password});return {error:null};}return legacy.auth.updateUser({password});}),
    resetPasswordForEmail:(email)=>wrap(async()=>{const results=await Promise.allSettled([identity.requestPasswordRecovery(email),legacy.auth.resetPasswordForEmail(email,{redirectTo:location.origin})]);if(results.every(r=>r.status==='rejected'))throw Error('No se pudo enviar el enlace.');return {error:null};}),
    signInWithOAuth:()=>wrap(async()=>{await identity.oauthLogin('google');return {error:null};}),
    onAuthStateChange:(callback)=>{
      identity.onAuthChange(async(event)=>callback(event==='recovery'?'PASSWORD_RECOVERY':event.toUpperCase(),(await session()).data.session));
      legacy.auth.onAuthStateChange(async(event)=>callback(event,(await session()).data.session));
    }
  };
  // Adapt the catalog's favorites and voting controls to the Netlify API.
  function from(table){
    const filters={},q={operation:'select',payload:null};
    const builder={
      select(){return builder;},eq(key,value){filters[key]=String(value);return builder;},
      delete(){q.operation='delete';return builder;},insert(payload){q.operation='insert';q.payload=payload;Object.assign(filters,payload);return builder;},
      then(ok,bad){return wrap(async()=>{
        if(table==='favorites'&&q.operation==='select'){const result=await window.rccMemberAPI('favorites');return {data:result.ids.map(script_id=>({script_id})),error:null};}
        if(table==='votes'&&q.operation==='select'){const result=await window.rccMemberAPI('thread',{params:{script:filters.script_id}});return {data:result.liked?[{script_id:filters.script_id}]:[],error:null};}
        if(['votes','favorites'].includes(table)){await window.rccMemberAPI(table==='votes'?'like':'favorite',{method:q.operation==='delete'?'DELETE':'PUT',params:{script:filters.script_id}});return {data:[],error:null};}
        throw Error('Operación no disponible.');
      }).then(ok,bad);}
    };return builder;
  }
  queueMicrotask(()=>identity.handleAuthCallback().catch(()=>{}));
  return {auth,from};
});
window.rccSupabaseReady.catch(()=>{});
