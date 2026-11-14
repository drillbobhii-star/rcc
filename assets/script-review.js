/* Compact editorial hints. A report is not a runtime test or a ban guarantee. */
(() => {
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  // Rotating RCC notes: 100+ original jokes, dark humor, tips and safety reminders.
  const rccNotes = [
  "Consejo RCC: si el script promete hacer todo con un clic, revisa qué hace ese clic antes de dárselo.",
  "El botón de deshacer es el mejor amigo de quien tiene curiosidad y poca paciencia.",
  "Si algo parece demasiado bueno para ser gratis, al menos lee la letra pequeña. Y la mediana.",
  "Tu cuenta vale más que cualquier espada virtual con complejo de protagonista.",
  "Advertencia: el código no lee mentes. Si no le explicas qué quieres, improvisará como estudiante en examen.",
  "Un respaldo hoy evita una novela de terror mañana.",
  "Si el menú tiene más opciones que un restaurante, prueba una por una.",
  "Recomendación: cambia una sola configuración cada vez. Así sabrás quién rompió qué.",
  "El script puede ser rápido; tu criterio debe ser más rápido todavía.",
  "Si no entiendes una línea peligrosa, no la ejecutes por fe. La fe no depura errores.",
  "Humor negro de programador: el servidor pidió descanso eterno y ahora responde desde el más allá.",
  "En el cementerio de proyectos, todos tenían una última actualización pendiente.",
  "Mi código no está muerto; está en modo de mantenimiento espiritual.",
  "El bug no desapareció. Solo aprendió a esconderse cuando abres la consola.",
  "Hay dos tipos de scripts: los que funcionan y los que te enseñan humildad.",
  "El funeral del rendimiento será a las 8. Lleguen temprano; el FPS ya no llega.",
  "El proyecto no se cayó: decidió acostarse un rato. No preguntes cuándo despierta.",
  "El error 404 fue a buscar una salida y tampoco la encontró.",
  "El programador dejó instrucciones: si no arranca, no lo despierten.",
  "Este código tiene más vidas que un gato, pero menos documentación.",
  "Si el script pide tu contraseña, dile que primero te invite a cenar.",
  "Un ejecutor desconocido es como una caja misteriosa: puede traer sorpresas que no querías.",
  "No confundas muchas líneas con calidad. Una ensalada también tiene muchos ingredientes.",
  "Si la descripción dice 'indetectable', recuerda que hasta los fantasmas dejan pistas.",
  "Los milagros existen, pero no suelen venir en un archivo llamado final_final_ahora_si.lua.",
  "Consejo: revisa los permisos antes de darle acceso a cualquier cosa.",
  "Si el código descarga otro código, averigua de dónde viene el invitado.",
  "Un nombre elegante no convierte un script dudoso en una obra de arte.",
  "Antes de culpar al juego, revisa la versión. A veces el culpable lleva meses en tu carpeta.",
  "Si algo falla, guarda el mensaje de error. La memoria humana tiene peor historial que un servidor lleno.",
  "El lag no es una característica premium. Si aparece, toca investigar.",
  "El FPS bajó tanto que ahora cuenta los fotogramas con calendario.",
  "El ping está tan alto que el personaje todavía no sabe que empezó la partida.",
  "Si tu PC suena como avión, quizá el script no necesita despegar.",
  "Recomendación: prueba primero en un entorno secundario cuando sea posible.",
  "Lee los comentarios con calma; una opinión no equivale a una prueba técnica.",
  "Si varios usuarios reportan lo mismo, no lo tapes con optimismo y una actualización de color.",
  "Un reporte no demuestra por sí solo un baneo, pero sí merece atención.",
  "Las promesas no son compatibilidad. Busca versiones, requisitos y pruebas reproducibles.",
  "El botón de copiar no es un certificado de seguridad. Solo copia texto.",
  "Si no hay documentación, toca investigar antes de confiar.",
  "Los scripts también envejecen. Algunos necesitan actualización; otros, jubilación.",
  "Si el creador desapareció, el código no heredó automáticamente su sabiduría.",
  "El mantenimiento preventivo es más barato que resucitar un proyecto roto.",
  "Un comentario útil explica el error, la versión y los pasos para reproducirlo.",
  "Evita pegar código que no has revisado en tu cuenta principal.",
  "Si te promete monedas infinitas, pregunta por qué no ha comprado ya la luna.",
  "El botón mágico no existe; existe el botón que abre otro problema.",
  "El código limpio no hace ruido. El ventilador de tu PC sí puede hacerlo.",
  "Una variable sin nombre claro es un misterio con sueldo.",
  "Si todo depende de una sola línea, esa línea merece supervisión adulta.",
  "Los errores pequeños también hacen grandes desastres cuando nadie los mira.",
  "Hoy es buen día para actualizar. También para leer qué cambió antes de hacerlo.",
  "No ejecutes tres versiones a la vez y luego culpes al universo por el caos.",
  "El mejor exploit de productividad es leer el README antes de preguntar.",
  "Si el script tiene una opción llamada 'destruir todo', quizá no sea la primera que debas probar.",
  "El código no tiene sentimientos, pero tus datos sí merecen respeto.",
  "Si algo pide permisos que no necesita, pregunta por qué antes de aceptar.",
  "Un archivo descargado no se vuelve confiable por tener un icono bonito.",
  "Los antivirus no son adivinos; combina herramientas, revisión y sentido común.",
  "El modo seguro no es cobardía: es estrategia con buena reputación.",
  "Cuando el changelog dice 'pequeños ajustes', revisa qué se tocó. Los pequeños ajustes también muerden.",
  "El desarrollador dijo 'solo falta un detalle'. Ese detalle ya tiene tres temporadas.",
  "El código compila. La paciencia del equipo, no tanto.",
  "El bug estaba entre la silla y el teclado. Caso cerrado, expediente archivado.",
  "El servidor está estable: lleva diez minutos sin inventarse una personalidad nueva.",
  "Si el script funciona a la primera, guarda una captura. Es un evento histórico.",
  "Cuando todo funciona, no toques nada. Cuando no funciona, tampoco toques todo.",
  "Una actualización sin notas es una caja sorpresa con teclado.",
  "Si vas a modificar algo, guarda primero la versión original. La nostalgia no restaura archivos.",
  "Los nombres de variables como x1, x2 y x_final son una búsqueda del tesoro.",
  "El código heredado no está embrujado; solo nadie recuerda quién escribió esa parte.",
  "Una buena prueba vale más que veinte comentarios diciendo 'me sirve'.",
  "Si el resultado cambia cada vez, revisa aleatoriedad, caché y estado antes de culpar a la suerte.",
  "El caché guarda recuerdos. A veces guarda demasiados.",
  "Si el navegador se congela, dale un momento; no le declares la guerra al botón.",
  "Un script sin límites puede convertir una tarea pequeña en una maratón de CPU.",
  "Menos efectos innecesarios, más fluidez. Tu móvil también quiere vivir.",
  "Si usas móvil, comprueba controles táctiles y consumo de memoria.",
  "En PC, revisa resolución y escalado. No todo botón nació para una pantalla gigante.",
  "El diseño bonito atrae; el funcionamiento correcto consigue que la gente se quede.",
  "Una interfaz clara evita que el usuario juegue a adivinar dónde está el botón.",
  "El mejor atajo es el que no te manda por un camino peor.",
  "Si ves una alerta de parcheado, tómala en serio. No es decoración navideña.",
  "Los reportes ayudan a la comunidad; inventarlos solo crea humo.",
  "Si encontraste un fallo, comparte pasos claros y evita publicar datos privados.",
  "No publiques claves, cookies ni tokens en comentarios. Eso no es una ofrenda al código.",
  "Tu contraseña no es un comentario de depuración. No la compartas.",
  "Si una función necesita acceso remoto, comprueba el destino y el propósito.",
  "El humor es gratis; recuperar una cuenta puede salir bastante caro.",
  "El script no es tu amigo imaginario. Revisa lo que hace.",
  "Si el creador ofrece soporte, usa los canales oficiales y no enlaces sospechosos.",
  "Una versión antigua puede funcionar hoy y romperse mañana. La compatibilidad tiene fecha de caducidad.",
  "El código que no se prueba es una hipótesis con autoestima.",
  "Si aparece un error nuevo, anota qué cambió justo antes. Las pistas suelen estar cerca.",
  "El proyecto pidió vacaciones, pero el bug se quedó de guardia.",
  "Descansa los ojos. Ni el mejor programador depura mejor a las tres de la madrugada.",
  "Si llevas una hora persiguiendo un bug, toma agua y vuelve con ojos nuevos.",
  "El teclado no tiene la culpa. Bueno, salvo cuando se cae encima del café.",
  "El café compila ideas; las pruebas compilan confianza.",
  "Un buen README es como un mapa: evita que todos terminen en el pantano.",
  "Si una función hace diez cosas, quizá necesita dividirse antes de convertirse en leyenda.",
  "El código elegante también debe ser accesible, rápido y fácil de mantener.",
  "El proyecto no necesita más fuegos artificiales; necesita que el botón funcione.",
  "Recuerda: guardar cambios no significa que ya estén publicados en producción.",
  "Antes de anunciar una mejora, verifica que realmente esté desplegada.",
  "Las cifras bonitas no sustituyen métricas reales. Mejor transparencia que fantasía.",
  "Si una estadística es estimada, debe decirlo claramente. Los números también merecen honestidad.",
  "Una comunidad sana corrige con respeto y reporta con pruebas.",
  "El humor negro se queda en el chiste; las cuentas y los datos se protegen en serio."
];
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
    const noteOffset=[...String(s.id||s.name||'rcc')].reduce((n,c)=>(n+c.charCodeAt(0))%rccNotes.length,0);
    texts.push(...rccNotes.slice(noteOffset).concat(rccNotes.slice(0,noteOffset)));
    return texts;
  }
  function assessment(s){return {status:s.review?.status||'pending',label:s.review?.status==='patched'?'Parcheado':'',message:messages(s)[0]};}
  function badge(s){
    if(s.review?.status!=='patched')return null;
    const button=el('button','Parcheado · ver aviso','patched-badge');button.type='button';
    button.setAttribute('aria-label','Parcheado: ver advertencia de '+s.name);
    button.addEventListener('click',event=>{event.stopPropagation();confirm(s);});return button;
  }
  const stickerKinds=[
    {terms:/advert|pelig|baneo|sanci|riesgo|segur|parchead|contrase|privad|virus|permiso|desconocid/i,emoji:'🚨',label:'ALERTA RCC',colors:['#ff4d6d','#54152d']},
    {terms:/error|bug|fall|roto|lag|fps|ping|servidor|problema|muri|funeral|cementerio/i,emoji:'💀',label:'BUG DETECTADO',colors:['#8b5cf6','#25124d']},
    {terms:/consejo|recomend|lee|revis|prueba|actualiz|document|respaldo|cuidado|mejor/i,emoji:'🧠',label:'MODO CONSEJO',colors:['#00bfa6','#064e50']},
    {terms:/program|código|script|variable|compil|teclado|README|depur|desarroll/i,emoji:'🤓',label:'MODO PROGRAMADOR',colors:['#3b82f6','#172554']},
    {terms:/humor|jaja|xd|chiste|funeral|cementerio|muert|fantasma/i,emoji:'😭',label:'NO PUEDE SER',colors:['#f59e0b','#713f12']},
    {terms:/cuenta|clave|contrase|token|cookie|privad|permiso/i,emoji:'🕵️',label:'OJO CON ESO',colors:['#ec4899','#500724']},
    {terms:/rendimiento|móvil|pc|pantalla|memoria|cpu|fluidez|ventilador/i,emoji:'🥶',label:'TU DISPOSITIVO',colors:['#06b6d4','#164e63']}
  ];
  function stickerKind(message){return stickerKinds.find(item=>item.terms.test(message))||{emoji:'😂',label:'REACCIÓN RCC',colors:['#f97316','#7c2d12']};}
  function memeSvg(message,kind,uniqueKey){
    let hash=2166136261;const source=String(uniqueKey)+'|'+String(message);
    for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619);}
    const n=hash>>>0,angle=n%360,shape=n%3,accent=kind.colors[0],dark=kind.colors[1];
    const caption=String(message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').slice(0,52);
    const decor=shape===0?'<circle cx="24" cy="28" r="13" fill="#fff" opacity=".22"/><path d="M145 18l8 17 18 3-13 13 3 18-16-9-16 9 3-18-13-13 18-3z" fill="#fff" opacity=".2"/>':shape===1?'<path d="M12 28l18-18 18 18-18 18zM137 142l18-18 18 18-18 18z" fill="#fff" opacity=".2"/>':'<path d="M0 112Q45 72 90 112T180 112V180H0z" fill="#fff" opacity=".14"/><circle cx="150" cy="28" r="18" fill="#fff" opacity=".16"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+accent+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient><filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity=".25"/></filter></defs><rect width="180" height="180" rx="22" fill="url(#g)"/>'+decor+'<g transform="rotate('+(angle%15-7)+' 90 83)" filter="url(#s)"><rect x="39" y="28" width="102" height="103" rx="25" fill="#fff"/><text x="90" y="101" text-anchor="middle" font-size="59">'+kind.emoji+'</text></g><rect x="8" y="8" width="164" height="22" rx="8" fill="#111827" opacity=".78"/><text x="90" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="900" letter-spacing="1" fill="#fff">'+kind.label+'</text><text x="90" y="153" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="800" fill="#fff">RCC MEME #'+(n%9999)+'</text><text x="90" y="166" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.5" fill="#fff" opacity=".9">'+caption+'</text></svg>';
  }
  function showSticker(box,message){
    const media=box.querySelector('.review-tip-media'),fallback=media?.querySelector('.review-tip-emoji');
    if(!media||!fallback)return;
    const kind=stickerKind(message),img=(()=>{let node=media.querySelector('img.review-tip-image');if(!node){node=el('img',null,'review-tip-image');node.alt='';node.loading='lazy';node.decoding='async';media.insertBefore(node,fallback);}return node;})();
    const uniqueKey=[box.dataset.reviewScript||'',box.dataset.noteStep||'0'].join(':');
    img.onerror=()=>{img.hidden=true;fallback.hidden=false;};img.onload=()=>{img.hidden=false;fallback.hidden=true;};
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(memeSvg(message,kind,uniqueKey));
    fallback.textContent=kind.emoji;
  }
  const scriptForTip=new WeakMap(),tipStep=new WeakMap();
  function tip(s,detail=false){
    const box=el('aside',null,'review-tip'+(detail?' review-tip-detail':''));box.dataset.reviewScript=String(s.id);
    const label=el('small','NOTA RCC'),content=el('div',null,'review-tip-content');
    const media=el('div',null,'review-tip-media'),fallback=el('span','😂','review-tip-emoji');
    const body=el('span',messages(s)[0]);
    media.append(fallback);content.append(body,media);box.append(label,content);
    scriptForTip.set(box,s);tipStep.set(box,0);box.dataset.noteStep='0';showSticker(box,body.textContent);
    if(detail)box.dataset.visible='true';
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
      const script=scriptForTip.get(box);if(script){tipStep.set(box,0);const body=box.querySelector('.review-tip-content > span');if(body){body.textContent=messages(script)[0];box.dataset.noteStep='0';showSticker(box,body.textContent);}}
    }
  }
  function commentsUnavailable(id){
    // Failed loading is not a negative report; retain only previously available evidence.
    localSignals.delete(String(id));
    for(const box of document.querySelectorAll('[data-review-script]'))if(box.dataset.reviewScript===String(id)){
      const script=scriptForTip.get(box);if(script){const body=box.querySelector('.review-tip-content > span');if(body){body.textContent=messages(script)[0];box.dataset.noteStep='0';showSticker(box,body.textContent);}}
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
    const body=box.querySelector('.review-tip-content > span');if(!body)return;const message=list[step%list.length];box.dataset.noteStep=String(step+1);body.textContent=message;showSticker(box,message);tipStep.set(box,step+1);box.dataset.visible='true';
  },7000);
  window.RCCScriptReview={assessment,messages,card,detail,comments,commentsUnavailable,summarize,confirm,cancel};
})();
