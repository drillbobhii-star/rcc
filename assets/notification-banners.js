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
    try{
      for(const [frequency,delay] of [[880,0],[1320,.11]]){
        const oscillator=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+delay;
        oscillator.type='sine';oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.09,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+.38);
        oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.4);
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
    const record={node,timer:null};active.set(item.id,record);
    const schedule=()=>{clearTimeout(record.timer);record.timer=setTimeout(()=>remove(item.id),5000);};
    node.addEventListener('pointerenter',()=>clearTimeout(record.timer));node.addEventListener('pointerleave',schedule);
    node.addEventListener('focusin',()=>clearTimeout(record.timer));node.addEventListener('focusout',()=>{if(!node.contains(document.activeElement))schedule();});
    dismiss.addEventListener('click',()=>remove(item.id));
    open.addEventListener('click',()=>{for(const id of active.keys())remove(id);window.rccOpenNotificationScript?.(item.scriptId);});
    live.textContent=item.message;ding();schedule();
  });
  window.addEventListener('rcc:notifications-reset',()=>{for(const id of active.keys())remove(id);live.textContent='';});
  new MutationObserver(()=>{if(email.hidden){for(const id of active.keys())remove(id);live.textContent='';}}).observe(email,{attributes:true,attributeFilter:['hidden']});
})();
