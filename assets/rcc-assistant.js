(() => {
  'use strict';
  if (document.getElementById('rccAssistantLauncher')) return;
  const guide = window.RCCAssistantGuide;
  if (!guide) return;
  const style = document.createElement('style');
  style.textContent = [
    '#rccAssistantLauncher{position:fixed;right:18px;bottom:92px;z-index:1900;border:1px solid #ffffff35;border-radius:999px;padding:13px 17px;background:linear-gradient(130deg,#216b88,#6654bd);color:#fff;font:700 14px system-ui;box-shadow:0 12px 38px #0008;cursor:pointer}',
    '#rccAssistantPanel{position:fixed;right:18px;bottom:156px;width:min(380px,calc(100vw - 24px));max-height:min(620px,calc(100vh - 110px));z-index:1910;display:flex;flex-direction:column;border:1px solid #9ec9f555;border-radius:20px;background:rgba(12,18,31,.97);color:#f5f7ff;box-shadow:0 22px 70px #000b;backdrop-filter:blur(22px);overflow:hidden;font:14px system-ui}',
    '#rccAssistantPanel[hidden],#rccAssistantLauncher[hidden]{display:none}',
    '.rcc-assistant-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:linear-gradient(120deg,#1c5872,#493d82);font-weight:800}',
    '.rcc-assistant-head small{display:block;font-size:10px;font-weight:500;opacity:.8;margin-top:3px}',
    '.rcc-assistant-head button{border:0;border-radius:9px;padding:6px 10px;background:#ffffff20;color:#fff;font-size:19px}',
    '#rccAssistantLog{padding:14px;overflow:auto;display:flex;flex-direction:column;gap:10px;min-height:130px}',
    '.rcc-assistant-msg{max-width:94%;padding:11px 12px;border-radius:13px;background:#202d43;color:#f2f5ff;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.rcc-assistant-msg.user{align-self:flex-end;background:#4a4784}',
    '.rcc-assistant-actions{display:flex;gap:7px;flex-wrap:wrap;padding:0 12px 10px}',
    '.rcc-assistant-actions button{border:1px solid #ffffff25;border-radius:999px;padding:7px 10px;background:#17283c;color:#dcecff;font-size:11px;cursor:pointer}',
    '.rcc-assistant-compose{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px;border-top:1px solid #ffffff20}',
    '#rccAssistantInput{min-width:0;border:1px solid #ffffff30;border-radius:10px;padding:11px;background:#0d1727;color:#fff;font:13px system-ui}',
    '#rccAssistantSend{border:0;border-radius:10px;padding:0 14px;background:#a9d7ef;color:#10283a;font-weight:800}',
    '.rcc-assistant-foot{padding:0 12px 10px;color:#aab8cc;font-size:10px}',
    '@media(max-width:520px){#rccAssistantLauncher{right:12px;bottom:82px;padding:11px 13px}#rccAssistantPanel{right:8px;bottom:146px;width:calc(100vw - 16px);max-height:72vh}}',
    '@media(prefers-reduced-motion:reduce){#rccAssistantPanel{scroll-behavior:auto}}'
  ].join('');
  const el=(tag,attrs={},text='')=>{const node=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));if(text)node.textContent=text;return node;};
  const launcher=el('button',{id:'rccAssistantLauncher',type:'button','aria-expanded':'false','aria-controls':'rccAssistantPanel'},'✦ Asistente RCC');
  const panel=el('section',{id:'rccAssistantPanel',hidden:true,'aria-label':'Asistente RCC'});
  const head=el('div',{class:'rcc-assistant-head'});
  const title=el('div');title.append(el('div',{},'Asistente RCC'),el('small',{},'Guía de catálogos, herramientas y novedades'));
  const close=el('button',{type:'button','aria-label':'Cerrar asistente'},'×');head.append(title,close);
  const log=el('div',{id:'rccAssistantLog','aria-live':'polite'});
  const suggestions=el('div',{class:'rcc-assistant-actions'});
  const compose=el('form',{class:'rcc-assistant-compose'});
  const input=el('input',{id:'rccAssistantInput',type:'text',maxlength:'200',placeholder:'Pregunta sobre RCC…','aria-label':'Pregunta para el asistente'});
  const send=el('button',{id:'rccAssistantSend',type:'submit'},'Enviar');compose.append(input,send);
  const foot=el('div',{class:'rcc-assistant-foot'},'Respuestas de ayuda locales. El código externo no está verificado por RCC.');
  panel.append(head,log,suggestions,compose,foot);document.head.append(style);document.body.append(launcher,panel);
  const say=(text,kind='bot')=>{const bubble=el('div',{class:'rcc-assistant-msg'+(kind==='user'?' user':'')},text);log.append(bubble);log.scrollTop=log.scrollHeight;};
  const speak=text=>{if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-DO';window.speechSynthesis.speak(utterance);};
  const open=()=>{panel.hidden=false;launcher.setAttribute('aria-expanded','true');input.focus();};
  const shut=()=>{panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus();};
  const quick=(label,query)=>{const button=el('button',{type:'button'},label);button.addEventListener('click',()=>answer(query));suggestions.append(button);};
  function act(action,query){
    if(action==='appearance')document.getElementById('rccMainCustomize')?.click();\n    else if(action==='java')document.getElementById('javaTab')?.click();
    else if(action==='roblox')document.getElementById('gamesTab')?.click();
    else if(action==='fivem')document.getElementById('fivemTab')?.click();
    else if(action==='updates'||action==='github')document.getElementById('updatesTab')?.click();\n    else if(action==='chat')document.getElementById('rccChatLauncher')?.click();\n    else if(action==='admin')window.location.href='/admin.html';
    else if(action==='catalogs')document.getElementById('libraryTab')?.click();
    else if(query){const search=document.getElementById('search');if(search){search.value=query;search.dispatchEvent(new Event('input',{bubbles:true}));}}
  }
  function answer(question){
    const clean=String(question||'').trim().slice(0,200);if(!clean)return;
    say(clean,'user');
    const resolved=guide.resolve(clean);
    if(!resolved){say('Puedo orientarte sobre Roblox/Luau, FiveM, Java, JavaScript, repositorios, novedades, personalización y el futuro buscador de mods APK. Prueba con una de esas palabras o abre Novedades.');return;}
    const response=resolved.query
      ? 'Puedes buscar «'+resolved.query+'» en el catálogo. Revisa la ficha, el entorno y la fuente original antes de utilizar el código.'
      : guide.answers[resolved.action] || 'Abre la sección correspondiente para consultar esta función.';
    say(response);
    if(resolved.action)act(resolved.action,resolved.query);
    const speakButton=el('button',{type:'button'},'🔊 Escuchar');speakButton.addEventListener('click',()=>speak(response));suggestions.append(speakButton);
  }
  launcher.addEventListener('click',open);close.addEventListener('click',shut);
  compose.addEventListener('submit',event=>{event.preventDefault();answer(input.value);input.value='';});
  quick('Novedades','¿Qué cambió en esta actualización?');
  quick('FiveM','¿Dónde encuentro scripts de FiveM?');
  quick('Java','¿Dónde encuentro ejemplos Java?');
  quick('Mods APK','¿Qué es el Buscador de mods APK?');
  quick('Perfiles','¿Ya está el buscador de perfiles?');
  quick('Chat','¿Cómo funciona el chat RCC?');
  quick('Panel admin','¿Qué herramientas tiene el panel admin?');\n  quick('Fondo y logo','¿Cómo personalizo el fondo del panel?');\n  quick('Mi perfil','¿Cómo cambio mi foto o banner?');\n  quick('Regalo RCC','¿Cómo funciona el regalo comunitario?');
  say('¡Hola! Soy el Asistente RCC, actualizado para el regalo de la comunidad. Puedo ayudarte con los catálogos, el acceso gratuito, perfiles, banners, fondos, chat, herramientas y administración. ¿Qué necesitas?');
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)shut();});
})();
