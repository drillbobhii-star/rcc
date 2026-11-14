/* Compact editorial hints. A report is not a runtime test or a ban guarantee. */
(() => {
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  const localSignals=new Map();
  const summarize=rows=>globalThis.RCCReviewSignals.summarize(rows);
  const empty=()=>({total:0,positive:0,negative:0,ban:0});
  function signals(script){
    const remote=['reviewed','partial'].includes(script.review?.commentsStatus)?script.review.externalComments:null;
    const local=localSignals.get(String(script.id));
    const sum=empty();for(const row of [remote,local])if(row)for(const key of Object.keys(sum))sum[key]+=Number(row[key])||0;
    return sum;
  }
  function messages(s){
    const title=String(s.name||'Este script'),r=signals(s),texts=[];
    if(s.review?.status==='patched')texts.push(`${title}: está marcado como parcheado. Mejor esperar una corrección; hoy toca banquillo, XD.`);
    if(r.positive&&r.negative)texts.push(`${title}: hay comentarios a favor y otros con fallos. Opiniones divididas, XD; funcionamiento incierto.`);
    else if(r.negative)texts.push(`${title}: ${r.negative} comentario(s) señalan fallos o parcheo. Poco recomendable hasta que se aclare.`);
    else if(r.positive)texts.push(`${title}: ${r.positive} comentario(s) favorables. Buena señal, pero no es una prueba de que siga funcionando.`);
    if(r.ban)texts.push(`${title}: hay ${r.ban} reporte(s) de sanción en los comentarios. Mejor no arriesgar una cuenta importante.`);
    if(!r.positive&&!r.negative&&!r.ban){
      const variants=[
        `${title}: aún sin reportes concluyentes. No le damos medalla por la portada, XD.`,
        `${title}: funcionamiento por comprobar. Modo detective antes del clic, XD.`,
        `${title}: sin opiniones concluyentes para recomendarlo. El nombre épico no hace milagros, XD.`
      ];
      const hash=[...String(s.id)].reduce((n,c)=>(n+c.charCodeAt(0))%3,0);texts.push(variants[hash]);
    }
    const text=[s.name,s.description,...(s.tags||[])].join(' ');
    if(/auto.?farm|auto.?win|afk|automat/i.test(text))texts.push(`${title}: anuncia automatización. Si el juego cambió sus eventos, el piloto automático puede quedarse dormido, XD.`);
    if(/aimbot|silent.?aim|\besp\b|kill.?aura/i.test(text))texts.push(`${title}: anuncia ventajas en partidas y puede activar medidas antitrampas. No hay garantía contra sanciones.`);
    if((s.tags||[]).includes('Con clave'))texts.push(`${title}: indica que necesita clave. Sin ella, el menú puede hacerse el misterioso, XD.`);
    if(s.platform==='roblox'&&/loadstring|httpget/i.test(s.code||''))texts.push(`${title}: no hay evidencia de que este script pueda evitar un baneo.`);
    if(s.review?.updateAvailable)texts.push(`${title}: hay una modificación de contenido registrada. Actualizado no significa infalible, XD.`);
    return texts;
  }
  function assessment(s){return {status:s.review?.status||'pending',label:s.review?.status==='patched'?'Parcheado':'',message:messages(s)[0]};}
  function badge(s){
    if(s.review?.status!=='patched')return null;
    const button=el('button','Parcheado · ver aviso','patched-badge');button.type='button';
    button.setAttribute('aria-label','Parcheado: ver advertencia de '+s.name);
    button.addEventListener('click',event=>{event.stopPropagation();confirm(s);});return button;
  }
  const scriptForTip=new WeakMap(),tipStep=new WeakMap();
  function tip(s,detail=false){
    const box=el('aside',null,'review-tip'+(detail?' review-tip-detail':''));box.dataset.reviewScript=String(s.id);
    const label=el('small','NOTA RCC'),body=el('span',messages(s)[0]);box.append(label,body);
    scriptForTip.set(box,s);tipStep.set(box,0);if(detail)box.dataset.visible='true';
    return box;
  }
  function eligible(s){return s.catalog_section==='games'||s.platform==='roblox';}
  function card(s,target){
    if(!eligible(s))return;
    const button=badge(s);if(button)target.querySelector('.badges')?.append(button);
    target.querySelector('.compat-status')?.after(tip(s));
  }
  function detail(s,target){
    if(!eligible(s))return;
    const box=el('section',null,'review-compact');
    const button=badge(s);if(button)box.append(button);box.append(tip(s,true));
    target.querySelector('.compat-detail')?.before(box);
  }
  function comments(id,rows){
    localSignals.set(String(id),summarize(rows));
    for(const box of document.querySelectorAll('[data-review-script]')){
      if(box.dataset.reviewScript!==String(id))continue;
      const script=scriptForTip.get(box);if(script){tipStep.set(box,0);box.querySelector('span').textContent=messages(script)[0];}
    }
  }
  function commentsUnavailable(id){
    // Failed loading is not a negative report; retain only previously available evidence.
    localSignals.delete(String(id));
    for(const box of document.querySelectorAll('[data-review-script]'))if(box.dataset.reviewScript===String(id)){
      const script=scriptForTip.get(box);if(script)box.querySelector('span').textContent=messages(script)[0];
    }
  }
  let dialog=null,timer=null,returnFocus=null;
  function cancel(restore=true){
    clearInterval(timer);timer=null;
    if(dialog){if(dialog.open)dialog.close();dialog.remove();dialog=null;}
    if(restore&&returnFocus?.isConnected)returnFocus.focus();returnFocus=null;
  }
  function confirm(s,action){
    if(s?.review?.status!=='patched')return false;
    cancel(false);returnFocus=document.activeElement;
    const node=dialog=el('dialog',null,'patched-confirm');
    node.setAttribute('aria-labelledby','patchedConfirmTitle');node.setAttribute('aria-describedby','patchedConfirmText');
    const title=el('h3','Script marcado como parcheado');title.id='patchedConfirmTitle';
    const text=el('p',`${s.name}: es posible que no funcione. Usarlo con un ejecutor externo puede implicar sanción o baneo. No hay evidencia de que este script pueda evitar un baneo.`);text.id='patchedConfirmText';
    const status=el('p',null,'patched-countdown');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const actions=el('div',null,'patched-confirm-actions'),no=el('button','No, volver','btn btn-ghost'),yes=el('button',null,'btn btn-primary');
    no.type=yes.type='button';yes.disabled=true;let seconds=5;
    const update=()=>{status.textContent=seconds?`Lee el aviso · ${seconds} s`:'Puedes elegir. No se realiza ninguna acción automáticamente.';yes.textContent=seconds?`Sí, continuar (${seconds})`:'Sí, continuar';yes.disabled=seconds>0;};
    update();actions.append(no,yes);node.append(title,text,status,actions);document.body.append(node);
    no.onclick=()=>cancel();yes.onclick=()=>{if(yes.disabled)return;cancel();action?.();};
    node.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();cancel();});
    node.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}});
    node.addEventListener('click',event=>{if(event.target===node)cancel();});
    node.showModal();no.focus();
    timer=setInterval(()=>{if(dialog!==node){clearInterval(timer);return;}seconds--;update();if(!seconds){clearInterval(timer);timer=null;}},1000);
    return true;
  }
  let active=0;
  setInterval(()=>{
    if(document.hidden)return;
    const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-paused');
    const all=[...document.querySelectorAll('.review-tip')];
    const detail=all.filter(box=>box.classList.contains('review-tip-detail')&&box.closest('.modal.open'));
    const visible=detail.length?detail:all.filter(box=>{if(box.classList.contains('review-tip-detail'))return false;const rect=box.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight;});
    if(!visible.length)return;
    if(reduce&&visible.some(box=>box.dataset.visible==='true'))return;
    for(const box of all)if(!box.classList.contains('review-tip-detail'))delete box.dataset.visible;
    const box=visible[active++%visible.length],s=scriptForTip.get(box);if(!s)return;
    const list=messages(s),step=tipStep.get(box)||0;
    box.querySelector('span').textContent=list[step%list.length];tipStep.set(box,step+1);box.dataset.visible='true';
  },10000);
  window.RCCScriptReview={assessment,messages,card,detail,comments,commentsUnavailable,summarize,confirm,cancel};
})();
