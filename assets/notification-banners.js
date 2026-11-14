/* Transient notification presentation; no records are stored by this layer. */
(() => {
  const stack=document.createElement('section');stack.className='notification-banners';stack.setAttribute('aria-label','Notificaciones recientes');
  const live=document.createElement('p');live.className='notification-announcer';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
  stack.append(live);document.body.append(stack);
  const active=new Map();let audio,lastDing=0;
  const email=document.getElementById('authEmail');
  function unlock(event){
    if(!event.isTrusted||!document.getElementById('notificationSound')?.checked)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}
  }
  document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
  function ding(){
    if(!document.getElementById('notificationSound')?.checked||audio?.state!=='running'||performance.now()-lastDing<500)return;
    lastDing=performance.now();
    const sounds={
      classic:{wave:'sine',notes:[[880,0,.16],[1320,.11,.25]]},
      soft:{wave:'sine',notes:[[660,0,.28],[880,.16,.34]]},
      pop:{wave:'triangle',notes:[[520,0,.09],[1040,.07,.13]]},
      digital:{wave:'square',notes:[[740,0,.08],[990,.09,.08],[1480,.18,.16]]},
      bell:{wave:'sine',notes:[[1046,0,.32],[1568,.08,.42]]}
    };
    const selected=document.getElementById('notificationSoundType')?.value||'classic';
    const sound=sounds[selected]||sounds.classic;
    try{
      for(const [frequency,delay,duration] of sound.notes){
        const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;
        oscillator.type=sound.wave;oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.075,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+duration+.02);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      }
    }catch{}
  }
  function remove(id){const item=active.get(id);if(!item)return;clearTimeout(item.timer);item.node.remove();active.delete(id);}
  window.addEventListener('rcc:notification',event=>{
    const item=event.detail;
    if(!item?.id||email.hidden||active.has(item.id))return;
    if(active.size>=3)remove(active.keys().next().value);
    const node=document.createElement('article');node.className='notification-banner';
    const open=document.createElement('button');open.type='button';open.className='notification-banner-open';
    const icon=document.createElement('span');icon.className='notification-banner-icon';icon.setAttribute('aria-hidden','true');icon.textContent=item.type==='like'?'♡':'↳';
    const content=document.createElement('span'),label=document.createElement('small'),text=document.createElement('strong');
    label.textContent='RCC · '+(Date.now()-Date.parse(item.createdAt)>30000?'Reciente':'Ahora');text.textContent=item.message;
    content.append(label,text);open.append(icon,content);
    const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='notification-banner-dismiss';dismiss.textContent='×';dismiss.setAttribute('aria-label','Descartar notificación');
    node.append(open,dismiss);stack.append(node);
    const record={node,timer:null,swipe:null};active.set(item.id,record);
    const schedule=()=>{clearTimeout(record.timer);record.timer=setTimeout(()=>remove(item.id),5000);};
    node.addEventListener('pointerdown',event=>{
      if(!event.isPrimary||event.button!==0||event.target.closest('.notification-banner-dismiss'))return;
      record.swipe={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,dy:0};
      node.setPointerCapture?.(event.pointerId);
    });
    node.addEventListener('pointermove',event=>{
      const gesture=record.swipe;if(!gesture||gesture.id!==event.pointerId)return;
      gesture.dx=event.clientX-gesture.x;gesture.dy=event.clientY-gesture.y;
      if(Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>8)clearTimeout(record.timer);
      node.style.setProperty('--swipe-x',gesture.dx+'px');
      node.style.setProperty('--swipe-y',gesture.dy+'px');
      node.classList.toggle('is-swiping',Math.abs(gesture.dx)>8||Math.abs(gesture.dy)>8);
    });
    const finishSwipe=event=>{
      const gesture=record.swipe;if(!gesture||gesture.id!==event.pointerId)return;
      record.swipe=null;
      const dx=gesture.dx,dy=gesture.dy;
      if(Math.abs(dx)>65||dy < -55){
        node.classList.remove('is-swiping');
        node.classList.add(dx < -65?'dismiss-left':dx > 65?'dismiss-right':'dismiss-up');
        setTimeout(()=>remove(item.id),190);
      }else{
        node.classList.remove('is-swiping');node.style.removeProperty('--swipe-x');node.style.removeProperty('--swipe-y');schedule();
      }
    };
    node.addEventListener('pointerup',finishSwipe);
    node.addEventListener('pointercancel',event=>{if(record.swipe?.id===event.pointerId){record.swipe=null;node.classList.remove('is-swiping');node.style.removeProperty('--swipe-x');node.style.removeProperty('--swipe-y');schedule();}});

    node.addEventListener('pointerenter',()=>clearTimeout(record.timer));node.addEventListener('pointerleave',schedule);
    node.addEventListener('focusin',()=>clearTimeout(record.timer));node.addEventListener('focusout',()=>{if(!node.contains(document.activeElement))schedule();});
    dismiss.addEventListener('click',()=>remove(item.id));
    open.addEventListener('click',()=>{for(const id of active.keys())remove(id);window.rccOpenNotificationScript?.(item.scriptId);});
    live.textContent=item.message;ding();schedule();
  });
  window.addEventListener('rcc:notifications-reset',()=>{for(const id of active.keys())remove(id);live.textContent='';});
  new MutationObserver(()=>{if(email.hidden){for(const id of active.keys())remove(id);live.textContent='';}}).observe(email,{attributes:true,attributeFilter:['hidden']});
})();
