(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const css = `
  #rccSocialOpen{border:1px solid var(--border-glass);background:rgba(255,255,255,.07);color:var(--text);border-radius:12px;padding:10px 16px;font-weight:750;cursor:pointer}
  #rccSocialDialog{position:fixed;inset:0;z-index:9800;background:rgba(3,5,10,.88);backdrop-filter:blur(18px);display:none;overflow:auto;padding:clamp(12px,3vw,32px)}
  #rccSocialDialog.open{display:block}#rccSocialShell{max-width:1080px;margin:0 auto;color:#f4f6ff}
  .rcc-social-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:8px 0 22px}
  .rcc-social-title{font-size:clamp(1.5rem,4vw,2.4rem);font-weight:850;letter-spacing:-.04em}
  .rcc-social-muted{color:#aab2c8}.rcc-social-search{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}
  .rcc-social-search input{flex:1;min-width:200px;background:#141a29;border:1px solid #ffffff20;border-radius:14px;padding:14px 16px;color:white;font:inherit}
  .rcc-social-btn{border:1px solid #ffffff25;background:#20283b;color:#fff;border-radius:12px;padding:10px 14px;font-weight:750;cursor:pointer}
  .rcc-social-btn.primary{background:linear-gradient(120deg,#7162db,#287f9d);border:0}.rcc-social-btn:disabled{opacity:.45;cursor:not-allowed}
  .rcc-social-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
  .rcc-social-user{display:flex;align-items:center;gap:12px;padding:14px;background:#141a29;border:1px solid #ffffff14;border-radius:17px;text-align:left;color:#fff;cursor:pointer}
  .rcc-social-user:hover{border-color:#8f8aff80;transform:translateY(-2px)}
  .rcc-social-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;background:linear-gradient(135deg,#7162db,#287f9d);flex:none}
  .rcc-social-vip{font-size:10px;color:#f4d98a;border:1px solid #c8a74c70;border-radius:99px;padding:2px 7px;margin-left:5px}
  .rcc-social-profile{background:#111827;border:1px solid #ffffff18;border-radius:22px;overflow:hidden}
  .rcc-social-cover{height:clamp(130px,25vw,230px);background:linear-gradient(120deg,#26345d,#1c6d7a);background-size:cover;background-position:center}
  .rcc-social-profilebody{padding:0 22px 24px}.rcc-social-profilehead{display:flex;align-items:end;gap:16px;margin-top:-42px;flex-wrap:wrap}
  .rcc-social-profilehead .rcc-social-avatar{width:94px;height:94px;border:5px solid #111827}
  .rcc-social-stats{display:flex;gap:22px;flex-wrap:wrap;margin:16px 0;color:#cbd5e1}
  .rcc-social-codes{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:18px}
  .rcc-social-code{background:#0b1220;border:1px solid #ffffff16;border-radius:14px;padding:14px;min-width:0}
  .rcc-social-code pre{max-height:210px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:#070b13;padding:10px;border-radius:9px;color:#c9e7ff;font-size:12px}
  .rcc-social-edit{display:grid;gap:9px;margin-top:18px;padding:14px;border:1px solid #ffffff18;border-radius:14px}
  .rcc-social-edit input,.rcc-social-edit textarea{width:100%;background:#0a1020;color:#fff;border:1px solid #ffffff20;border-radius:10px;padding:10px;font:inherit}
  #rccSocialStatus{min-height:22px;color:#aab2c8;margin:10px 0}
  @media(max-width:600px){#rccSocialDialog{padding:10px}.rcc-social-profilebody{padding:0 14px 18px}.rcc-social-stats{gap:12px}}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.append(style);
  const nav = document.querySelector(".section-tabs");
  if (nav && !$("rccSocialOpen")) {
    const button = document.createElement("button"); button.id = "rccSocialOpen"; button.type = "button"; button.textContent = "👥 Comunidad";
    nav.append(button);
  }
  if (!$("rccSocialDialog")) {
    const dialog = document.createElement("div"); dialog.id = "rccSocialDialog"; dialog.setAttribute("role","dialog"); dialog.setAttribute("aria-modal","true"); dialog.setAttribute("aria-label","Comunidad RCC");
    dialog.innerHTML = `<div id="rccSocialShell"><div class="rcc-social-top"><div><div class="rcc-social-title">Comunidad RCC</div><div class="rcc-social-muted">Descubre creadores y comparte tus códigos.</div></div><button class="rcc-social-btn" id="rccSocialClose">Cerrar ✕</button></div><div class="rcc-social-search"><input id="rccSocialQuery" type="search" placeholder="Buscar por nombre o @usuario…" autocomplete="off"><button class="rcc-social-btn" id="rccSocialVip">💎 Solo VIP: no</button></div><div id="rccSocialStatus" role="status" aria-live="polite">Cargando comunidad…</div><div id="rccSocialResults" class="rcc-social-grid"></div><div id="rccSocialProfile"></div></div>`;
    document.body.append(dialog);
  }
  const dialog = $("rccSocialDialog"), queryInput = $("rccSocialQuery"), results = $("rccSocialResults"), profileBox = $("rccSocialProfile"), status = $("rccSocialStatus"), vipButton = $("rccSocialVip");
  let supabase = null, token = "", vipOnly = false, searchTimer = 0, currentProfile = null, creatorMessagesEnabled = true;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  async function auth() {
    try { supabase = await window.rccSupabaseReady; const {data}=await supabase.auth.getSession(); token=data.session?.access_token || ""; }
    catch (_) { token=""; }
  }
  async function api(url, body) {
    const response = await fetch("/api/social" + (url || ""), { method: body ? "POST" : "GET", headers: { ...(token ? {Authorization:"Bearer "+token}:{}), ...(body ? {"Content-Type":"application/json"}:{}) }, body: body ? JSON.stringify(body) : undefined, cache:"no-store" });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
    return data;
  }
  function setStatus(text, error=false){status.textContent=text;status.style.color=error?"#ff9ca8":"#aab2c8";}
  function userCard(user){
    const button=document.createElement("button");button.type="button";button.className="rcc-social-user";
    const img=document.createElement("img");img.className="rcc-social-avatar";img.alt="";img.src=user.avatar_url||"";
    const meta=document.createElement("span");meta.style.minWidth="0";
    const name=document.createElement("strong");name.textContent=user.display_name||"Usuario RCC";
    if(user.is_vip){const vip=document.createElement("span");vip.className="rcc-social-vip";vip.textContent="VIP";name.append(vip);}
    const handle=document.createElement("small");handle.className="rcc-social-muted";handle.textContent=user.username?"@"+user.username:"Miembro RCC";
    meta.append(name,document.createElement("br"),handle);button.append(img,meta);button.addEventListener("click",()=>openProfile(user.user_id));return button;
  }
  async function search(){
    profileBox.replaceChildren();results.replaceChildren();
    try{
      const q=queryInput.value.trim();const data=await api("?q="+encodeURIComponent(q));
      if(data.enabled===false){setStatus("El descubrimiento de perfiles está desactivado por el administrador.");return;}
      creatorMessagesEnabled=data.settings?.creator_messages_enabled!==false;
      let list=data.profiles||[];if(vipOnly)list=list.filter(user=>user.is_vip);
      const creator=list.find(user=>user.is_creator);
      if(creator){const heading=document.createElement("div");heading.className="rcc-social-muted";heading.style.gridColumn="1/-1";heading.textContent="CREADOR OFICIAL · RECOMENDADO";results.append(heading,userCard(creator));list=list.filter(user=>user.user_id!==creator.user_id);}
      list.forEach(user=>results.append(userCard(user)));
      setStatus(list.length||creator?"Selecciona un perfil para ver su portada, seguidores y códigos.":"No encontramos perfiles con esa búsqueda.");
    }catch(error){setStatus(error.message,true);}
  }
  async function openProfile(id){
    try{
      setStatus("Abriendo perfil…");results.replaceChildren();
      const data=await api("?user="+encodeURIComponent(id));currentProfile=data.profile;creatorMessagesEnabled=data.settings?.creator_messages_enabled!==false;
      renderProfile(currentProfile);
      setStatus("Perfil cargado correctamente.");
    }catch(error){setStatus(error.message,true);}
  }
  function renderProfile(p){
    profileBox.replaceChildren();
    const card=document.createElement("section");card.className="rcc-social-profile";
    const cover=document.createElement("div");cover.className="rcc-social-cover";if(p.cover_url)cover.style.backgroundImage="url("+JSON.stringify(p.cover_url)+")";
    const body=document.createElement("div");body.className="rcc-social-profilebody";
    const head=document.createElement("div");head.className="rcc-social-profilehead";
    const avatar=document.createElement("img");avatar.className="rcc-social-avatar";avatar.alt="";avatar.src=p.avatar_url||"";
    const identity=document.createElement("div");identity.style.flex="1";identity.style.minWidth="180px";
    const name=document.createElement("h2");name.textContent=p.display_name+(p.is_vip?" 💎":"")+(p.is_creator?" ✓":"");
    const handle=document.createElement("div");handle.className="rcc-social-muted";handle.textContent=p.username?"@"+p.username:"Miembro RCC";
    identity.append(name,handle);
    const actions=document.createElement("div");actions.style.display="flex";actions.style.gap="8px";actions.style.flexWrap="wrap";
    if(token && p.user_id!== (supabase?.auth ? "" : "")){
      const follow=document.createElement("button");follow.className="rcc-social-btn primary";follow.textContent=p.is_following?"Siguiendo":"Seguir";
      follow.addEventListener("click",async()=>{follow.disabled=true;try{const r=await api("",{action:p.is_following?"unfollow":"follow",userId:p.user_id});p.is_following=r.following;follow.textContent=p.is_following?"Siguiendo":"Seguir";}catch(e){setStatus(e.message,true);}finally{follow.disabled=false;}});
      actions.append(follow);
    }
    const message=document.createElement("button");message.className="rcc-social-btn";message.textContent=p.is_creator?"Enviar mensaje":"Enviar mensaje · Próximamente";
    message.disabled=!p.is_creator || !creatorMessagesEnabled;
    message.title=!p.is_creator?"Disponible próximamente":(!creatorMessagesEnabled?"El creador ha desactivado temporalmente la recepción de mensajes.":"Abrir soporte RCC");
    message.addEventListener("click",()=>{const launcher=$("rccChatLauncher");if(launcher)launcher.click();else setStatus("El chat de soporte no está disponible en este momento.",true);});
    actions.append(message);
    head.append(avatar,identity,actions);
    const bio=document.createElement("p");bio.className="rcc-social-muted";bio.style.marginTop="12px";bio.textContent=p.bio||"Este usuario todavía no ha añadido una biografía.";
    const stats=document.createElement("div");stats.className="rcc-social-stats";
    [["Seguidores",p.followers_count],["Siguiendo",p.following_count],["Códigos",p.codes?.length||0]].forEach(([label,value])=>{const item=document.createElement("span");item.innerHTML="<strong>"+Number(value||0)+"</strong> "+label;stats.append(item);});
    body.append(head,bio,stats);
    const codes=document.createElement("div");codes.className="rcc-social-codes";
    (p.codes||[]).forEach(code=>{const item=document.createElement("article");item.className="rcc-social-code";const title=document.createElement("h3");title.textContent=code.title;const game=document.createElement("p");game.className="rcc-social-muted";game.textContent=code.game_name||"Código RCC";const desc=document.createElement("p");desc.textContent=code.description||"";const pre=document.createElement("pre");pre.textContent=code.code_text;const copy=document.createElement("button");copy.className="rcc-social-btn";copy.textContent="Copiar código";copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(code.code_text);copy.textContent="Copiado ✓";}catch(_){setStatus("No se pudo copiar el código.",true);}});item.append(title,game,desc,pre,copy);codes.append(item);});
    if(!codes.children.length){const empty=document.createElement("p");empty.className="rcc-social-muted";empty.textContent="Todavía no hay códigos publicados en este perfil.";codes.append(empty);}
    body.append(codes);
    if(p.user_id && token){
      const edit=document.createElement("details");edit.className="rcc-social-edit";const summary=document.createElement("summary");summary.textContent="Editar mi perfil y publicar códigos";edit.append(summary);
      const username=document.createElement("input");username.placeholder="Nombre de usuario (3–24 caracteres)";username.value=p.username||"";
      const about=document.createElement("textarea");about.placeholder="Biografía";about.maxLength=280;about.value=p.bio||"";
      const coverInput=document.createElement("input");coverInput.placeholder="URL HTTPS de portada";coverInput.value=p.cover_url||"";
      const save=document.createElement("button");save.className="rcc-social-btn";save.textContent="Guardar perfil";save.addEventListener("click",async()=>{try{await api("",{action:"updateProfile",username:username.value,bio:about.value,cover_url:coverInput.value});setStatus("Perfil actualizado. Vuelve a abrirlo para ver los cambios.");}catch(e){setStatus(e.message,true);}});
      const codeTitle=document.createElement("input");codeTitle.placeholder="Título del código";const game=document.createElement("input");game.placeholder="Juego o categoría";
      const description=document.createElement("textarea");description.placeholder="Descripción breve";const code=document.createElement("textarea");code.placeholder="Pega tu código aquí";code.rows=6;
      const publish=document.createElement("button");publish.className="rcc-social-btn primary";publish.textContent="Publicar código";publish.addEventListener("click",async()=>{try{await api("",{action:"addCode",title:codeTitle.value,game_name:game.value,description:description.value,code_text:code.value});setStatus("Código publicado correctamente.");await openProfile(p.user_id);}catch(e){setStatus(e.message,true);}});
      edit.append(username,about,coverInput,save,codeTitle,game,description,code,publish);body.append(edit);
    }
    card.append(cover,body);profileBox.append(card);
  }
  $("rccSocialOpen")?.addEventListener("click",async()=>{dialog.classList.add("open");await auth();queryInput.value="";vipOnly=false;vipButton.textContent="💎 Solo VIP: no";await search();queryInput.focus();});
  $("rccSocialClose")?.addEventListener("click",()=>dialog.classList.remove("open"));
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.classList.remove("open");});
  queryInput?.addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>void search(),250);});
  vipButton?.addEventListener("click",()=>{vipOnly=!vipOnly;vipButton.textContent="💎 Solo VIP: "+(vipOnly?"sí":"no");void search();});
  document.addEventListener("keydown",event=>{if(event.key==="Escape")dialog.classList.remove("open");});
  // Bring background selection into the existing Personalizar section, including GIFs.
  const personal = document.querySelector("#personalization .personalization-body");
  if(personal && !$("rccBackgroundPersonalizer")){
    const panel=document.createElement("section");panel.id="rccBackgroundPersonalizer";panel.className="rcc-social-edit";
    panel.innerHTML='<h3>Fondo de pantalla</h3><p class="rcc-social-muted">Personaliza el fondo desde esta sección. Se admiten imágenes y GIF animados.</p><input id="rccBackgroundFile" type="file" accept="image/*,.gif"><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="rccBackgroundApply" class="rcc-social-btn">Aplicar fondo</button><button id="rccBackgroundClear" class="rcc-social-btn">Restaurar fondo</button></div><p class="rcc-social-muted" id="rccBackgroundStatus"></p>';
    personal.append(panel);
    let pending="";
    $("rccBackgroundFile").addEventListener("change",event=>{const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")||file.size>4*1024*1024){$("rccBackgroundStatus").textContent="Elige una imagen o GIF de hasta 4 MB.";return;}const reader=new FileReader();reader.onload=()=>{pending=String(reader.result||"");$("rccBackgroundStatus").textContent="Vista previa lista. Pulsa Aplicar fondo.";};reader.readAsDataURL(file);});
    $("rccBackgroundApply").addEventListener("click",()=>{if(!pending)return;$("rccBackgroundStatus").textContent="Guardando…";try{localStorage.setItem("rcc-social-background",pending);document.body.style.backgroundImage="linear-gradient(#05050599,#05050599),url("+JSON.stringify(pending)+")";document.body.style.backgroundSize="cover";document.body.style.backgroundAttachment="fixed";$("rccBackgroundStatus").textContent="Fondo guardado en este dispositivo."; }catch(_){$("rccBackgroundStatus").textContent="La imagen es demasiado grande para el almacenamiento local."; }});
    $("rccBackgroundClear").addEventListener("click",()=>{localStorage.removeItem("rcc-social-background");document.body.style.backgroundImage="";document.body.style.backgroundSize="";document.body.style.backgroundAttachment="";$("rccBackgroundStatus").textContent="Fondo restaurado.";});
    try{const saved=localStorage.getItem("rcc-social-background");if(saved){document.body.style.backgroundImage="linear-gradient(#05050599,#05050599),url("+JSON.stringify(saved)+")";document.body.style.backgroundSize="cover";document.body.style.backgroundAttachment="fixed";}}catch(_){}
  }
})();