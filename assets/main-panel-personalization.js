(() => {
  'use strict';
  const $=(id)=>document.getElementById(id);
  const IMAGE_MAX=20*1024*1024;
  const MIME_BY_EXT={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',avif:'image/avif',bmp:'image/bmp'};
  const style=document.createElement('style');
  style.textContent=`
    #rccMainBackdrop{position:fixed;inset:0;z-index:0;pointer-events:none;background-position:center;background-size:cover;background-repeat:no-repeat;opacity:var(--rcc-main-bg-opacity,.42);transition:opacity .2s}
    #rccMainBackdrop:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,7,14,.2),rgba(4,7,14,.58))}
    #rccMainLogo{position:fixed;z-index:1;pointer-events:none;left:50%;top:50%;transform:translate(-50%,-50%);width:min(var(--rcc-logo-size,220px),65vw);max-height:45vh;object-fit:contain;opacity:var(--rcc-logo-opacity,.28);filter:drop-shadow(0 8px 28px #0008)}
    body.rcc-custom-main-background .glass-background,body.rcc-custom-main-background>.blob{opacity:.12}
    #rccMainCustomize{position:fixed;right:18px;bottom:18px;z-index:1800;border:1px solid #ffffff35;border-radius:999px;padding:12px 17px;background:#171d2c;color:#fff;font:700 .88rem inherit;box-shadow:0 8px 28px #0008;cursor:pointer}
    #rccMainCustomize:hover{background:#29334c}
    #rccMainDialog{position:fixed;inset:0;z-index:2100;display:none;align-items:center;justify-content:center;padding:16px;background:#030611c9;backdrop-filter:blur(10px)}
    #rccMainDialog.open{display:flex}
    #rccMainDialog .rcc-main-box{width:min(620px,100%);max-height:92vh;overflow:auto;border:1px solid #9d8be866;border-radius:22px;padding:22px;background:linear-gradient(145deg,#1b2132,#0b101d);color:#f4f6ff;box-shadow:0 25px 80px #000b}
    #rccMainDialog h2{font-size:1.25rem;margin:0 42px 8px 0}
    #rccMainDialog p{color:#aeb8cc;line-height:1.5;margin:0 0 16px}
    #rccMainDialog .rcc-main-close{float:right;border:0;background:#ffffff14;color:#fff;border-radius:10px;padding:8px 12px;font-size:1.2rem;cursor:pointer}
    #rccMainDialog label{display:grid;gap:7px;margin:14px 0;color:#dce4f5;font-size:.9rem}
    #rccMainDialog input[type=file],#rccMainDialog select{width:100%;max-width:100%;padding:11px;border:1px solid #ffffff2b;border-radius:11px;background:#0c1424;color:#fff;font:inherit}
    #rccMainDialog input[type=range]{width:100%;accent-color:#c17bff}
    #rccMainDialog .rcc-main-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #rccMainDialog .rcc-main-check{display:flex;align-items:center;gap:10px}
    #rccMainDialog .rcc-main-check input{width:18px;height:18px;accent-color:#c17bff}
    #rccMainDialog .rcc-main-actions{display:flex;gap:10px;margin-top:18px}
    #rccMainDialog button.rcc-main-save,#rccMainDialog button.rcc-main-reset{flex:1;border:0;border-radius:12px;padding:13px;font:700 .95rem inherit;cursor:pointer}
    #rccMainDialog button.rcc-main-save{background:#d52bd8;color:#190b20}
    #rccMainDialog button.rcc-main-reset{background:#ffffff18;color:#fff;border:1px solid #ffffff25}
    #rccMainStatus{min-height:1.4em;margin-top:12px!important;font-size:.85rem}
    @media(max-width:520px){#rccMainCustomize{right:12px;bottom:12px;padding:11px 13px}#rccMainDialog .rcc-main-grid{grid-template-columns:1fr}#rccMainDialog .rcc-main-box{padding:17px}}
  `;
  document.head.append(style);
  const backdrop=document.createElement('div');backdrop.id='rccMainBackdrop';backdrop.setAttribute('aria-hidden','true');
  const logo=document.createElement('div');logo.id='rccMainLogo';logo.textContent='RCC';logo.setAttribute('aria-hidden','true');logo.hidden=true;
  document.body.prepend(backdrop,logo);
  const trigger=document.createElement('button');trigger.id='rccMainCustomize';trigger.type='button';trigger.textContent='🎨 Personalizar fondo';
  const dialog=document.createElement('div');dialog.id='rccMainDialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','rccMainTitle');
  dialog.innerHTML=`<section class="rcc-main-box"><button class="rcc-main-close" type="button" aria-label="Cerrar">×</button><h2 id="rccMainTitle">Personaliza el panel principal</h2><p>Elige una foto o GIF animado para el fondo. Puedes superponer el logo RCC o tu propio logo y ajustar su apariencia.</p>
  <label>Fondo del panel · imagen o GIF<input id="rccMainBgFile" type="file" accept="image/*"></label>
  <div class="rcc-main-grid"><label>Cómo encajar el fondo<select id="rccMainFit"><option value="cover">Cubrir toda la pantalla</option><option value="contain">Mostrar imagen completa</option><option value="auto">Tamaño original</option></select></label><label>Posición<select id="rccMainPosition"><option value="center">Centro</option><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="left">Izquierda</option><option value="right">Derecha</option></select></label></div>
  <label>Intensidad del fondo <output id="rccMainBgValue">42%</output><input id="rccMainBgOpacity" type="range" min="10" max="100" value="42"></label>
  <label class="rcc-main-check"><input id="rccMainLogoEnabled" type="checkbox"> Mostrar un logo encima del fondo</label>
  <label>Logo personalizado (opcional; si no eliges uno, se muestra RCC)<input id="rccMainLogoFile" type="file" accept="image/*"></label>
  <div class="rcc-main-grid"><label>Tamaño del logo <output id="rccMainLogoSizeValue">220 px</output><input id="rccMainLogoSize" type="range" min="60" max="520" value="220"></label><label>Opacidad del logo <output id="rccMainLogoOpacityValue">28%</output><input id="rccMainLogoOpacity" type="range" min="5" max="100" value="28"></label></div>
  <label>Posición del logo<select id="rccMainLogoPosition"><option value="center">Centro</option><option value="top-left">Arriba a la izquierda</option><option value="top-right">Arriba a la derecha</option><option value="bottom-left">Abajo a la izquierda</option><option value="bottom-right">Abajo a la derecha</option></select></label>
  <div class="rcc-main-actions"><button class="rcc-main-save" id="rccMainSave" type="button">Guardar personalización</button><button class="rcc-main-reset" id="rccMainReset" type="button">Quitar fondo</button></div><p id="rccMainStatus" role="status" aria-live="polite"></p></section>`;
  document.body.append(trigger,dialog);
  const ids=['rccMainBgFile','rccMainFit','rccMainPosition','rccMainBgOpacity','rccMainLogoEnabled','rccMainLogoFile','rccMainLogoSize','rccMainLogoOpacity','rccMainLogoPosition'];
  const el=id=>$(id);
  let bgFile=null,logoFile=null,bgUrl='',logoUrl='',ownerId=null,loaded=false,authListenerReady=false;
  const status=message=>{el('rccMainStatus').textContent=message||'';};
  const getMime=file=>{const ext=(file.name.split('.').pop()||'').toLowerCase();const mime=file.type?.startsWith('image/')?file.type:MIME_BY_EXT[ext];if(!mime)throw new Error('El archivo debe ser una imagen compatible.');return mime;};
  const validate=file=>{if(!file)return;getMime(file);if(file.size>IMAGE_MAX)throw new Error('Cada imagen puede pesar hasta 20 MB.');};
  const setLogoPosition=value=>{const map={'center':['50%','50%'],'top-left':['8%','12%'],'top-right':['92%','12%'],'bottom-left':['8%','88%'],'bottom-right':['92%','88%']};const [x,y]=map[value]||map.center;logo.style.left=x;logo.style.top=y;logo.style.transform='translate(-50%,-50%)';};
  const apply=()=>{
    backdrop.style.backgroundImage=bgUrl?'url("'+bgUrl.replace(/["\\]/g,'')+'")':'none';
    backdrop.style.backgroundSize=el('rccMainFit').value;backdrop.style.backgroundPosition=el('rccMainPosition').value;
    backdrop.style.setProperty('--rcc-main-bg-opacity',String(Number(el('rccMainBgOpacity').value)/100));
    document.body.classList.toggle('rcc-custom-main-background',!!bgUrl);
    const enabled=el('rccMainLogoEnabled').checked;
    logo.hidden=!enabled;
    if(enabled){logo.textContent=logoUrl?'':'RCC';logo.style.backgroundImage=logoUrl?'url("'+logoUrl.replace(/["\\]/g,'')+'")':'none';logo.style.backgroundSize='contain';logo.style.backgroundPosition='center';logo.style.backgroundRepeat='no-repeat';logo.style.width=el('rccMainLogoSize').value+'px';logo.style.height=Math.min(Number(el('rccMainLogoSize').value),220)+'px';logo.style.opacity=String(Number(el('rccMainLogoOpacity').value)/100);setLogoPosition(el('rccMainLogoPosition').value);}
    el('rccMainBgValue').textContent=el('rccMainBgOpacity').value+'%';
    el('rccMainLogoSizeValue').textContent=el('rccMainLogoSize').value+' px';
    el('rccMainLogoOpacityValue').textContent=el('rccMainLogoOpacity').value+'%';
  };
  const open=()=>{dialog.classList.add('open');document.body.style.overflow='hidden';el('rccMainBgFile').focus();};
  const close=()=>{dialog.classList.remove('open');document.body.style.overflow='';trigger.focus();};
  trigger.addEventListener('click',open);dialog.querySelector('.rcc-main-close').addEventListener('click',close);dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog.classList.contains('open'))close();});
  el('rccMainBgFile').addEventListener('change',()=>{bgFile=el('rccMainBgFile').files?.[0]||null;try{validate(bgFile);if(bgFile){const u=URL.createObjectURL(bgFile);bgUrl=u;apply();status('Vista previa del fondo lista. Guarda para publicarla en tu cuenta.');}}catch(e){status(e.message);bgFile=null;el('rccMainBgFile').value='';}});
  el('rccMainLogoFile').addEventListener('change',()=>{logoFile=el('rccMainLogoFile').files?.[0]||null;try{validate(logoFile);if(logoFile){logoUrl=URL.createObjectURL(logoFile);el('rccMainLogoEnabled').checked=true;apply();status('Vista previa del logo lista. Guarda para aplicarla.');}}catch(e){status(e.message);logoFile=null;el('rccMainLogoFile').value='';}});
  ids.slice(1,5).concat(ids.slice(6)).forEach(id=>el(id).addEventListener('input',apply));
  el('rccMainLogoEnabled').addEventListener('change',apply);
  async function client(){const sb=await window.rccSupabaseReady;if(!sb)throw new Error('No se pudo conectar con RCC.');const {data,error}=await sb.auth.getSession();if(error)throw error;if(!data.session?.user)throw new Error('Inicia sesión para guardar tu fondo personal.');return {sb,user:data.session.user};}
  async function upload(sb,user,file,folder){const mime=getMime(file);const ext=(file.name.split('.').pop()||'img').toLowerCase().replace(/[^a-z0-9]/g,'');const path=user.id+'/main-panel/'+folder+'/'+crypto.randomUUID()+'.'+(ext||'img');const {data,error}=await sb.storage.from('profile-media').upload(path,file,{upsert:false,contentType:mime,cacheControl:'3600'});if(error)throw error;return sb.storage.from('profile-media').getPublicUrl(data.path).data.publicUrl;}
  async function load(){try{const {sb,user}=await client();if(!authListenerReady){authListenerReady=true;sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session?.user?.id!==ownerId)load();if(event==='SIGNED_OUT'){ownerId=null;bgUrl='';logoUrl='';apply();}});}ownerId=user.id;const {data,error}=await sb.from('profiles').select('main_background_url,main_background_fit,main_background_position,main_background_opacity,main_logo_url,main_logo_enabled,main_logo_size,main_logo_opacity,main_logo_position').eq('user_id',user.id).maybeSingle();if(error)throw error;if(data){bgUrl=data.main_background_url||'';logoUrl=data.main_logo_url||'';el('rccMainFit').value=data.main_background_fit||'cover';el('rccMainPosition').value=data.main_background_position||'center';el('rccMainBgOpacity').value=Math.round((data.main_background_opacity??.42)*100);el('rccMainLogoEnabled').checked=data.main_logo_enabled===true;el('rccMainLogoSize').value=data.main_logo_size||220;el('rccMainLogoOpacity').value=Math.round((data.main_logo_opacity??.28)*100);el('rccMainLogoPosition').value=data.main_logo_position||'center';}loaded=true;apply();}catch(e){status(e.message||'No se pudo cargar tu personalización.');}}
  el('rccMainSave').addEventListener('click',async()=>{const button=el('rccMainSave');button.disabled=true;try{const {sb,user}=await client();if(bgFile){status('Subiendo fondo…');bgUrl=await upload(sb,user,bgFile,'backgrounds');}if(logoFile){status('Subiendo logo…');logoUrl=await upload(sb,user,logoFile,'logos');}const payload={user_id:user.id,main_background_url:bgUrl||null,main_background_fit:el('rccMainFit').value,main_background_position:el('rccMainPosition').value,main_background_opacity:Number(el('rccMainBgOpacity').value)/100,main_logo_url:logoUrl||null,main_logo_enabled:el('rccMainLogoEnabled').checked,main_logo_size:Number(el('rccMainLogoSize').value),main_logo_opacity:Number(el('rccMainLogoOpacity').value)/100,main_logo_position:el('rccMainLogoPosition').value,updated_at:new Date().toISOString()};const {error}=await sb.from('profiles').upsert(payload,{onConflict:'user_id'});if(error)throw error;bgFile=null;logoFile=null;loaded=true;apply();status('¡Personalización guardada en tu cuenta!');}catch(e){status(e.message||'No se pudo guardar.');}finally{button.disabled=false;}});
  el('rccMainReset').addEventListener('click',async()=>{try{const {sb,user}=await client();const {error}=await sb.from('profiles').update({main_background_url:null,main_logo_url:null,main_logo_enabled:false,updated_at:new Date().toISOString()}).eq('user_id',user.id);if(error)throw error;bgUrl='';logoUrl='';bgFile=null;logoFile=null;el('rccMainLogoEnabled').checked=false;el('rccMainBgFile').value='';el('rccMainLogoFile').value='';apply();status('Fondo y logo personalizados retirados.');}catch(e){status(e.message||'No se pudo quitar la personalización.');}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loaded)load();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
  window.addEventListener('rcc:auth-changed',load);
})();