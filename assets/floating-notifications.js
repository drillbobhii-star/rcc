/* Floating UI only; notification data remains owned by the community integration. */
(() => {
  const email = document.getElementById('authEmail');
  if (!email) return;
  const control = document.createElement('aside');
  control.className = 'floating-notifications';
  control.hidden = true;
  control.innerHTML = `<button type="button" class="notification-bell" aria-label="Abrir notificaciones" aria-expanded="false" aria-controls="floatingNotificationPanel" aria-describedby="notificationMoveHint" title="Notificaciones · mantén presionado para mover; Alt + flechas con el teclado"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><section id="floatingNotificationPanel" class="floating-notification-panel" aria-labelledby="floatingNotificationTitle" hidden><div class="notification-panel-heading"><h2 id="floatingNotificationTitle">Notificaciones</h2><button type="button" class="notification-close" aria-label="Cerrar notificaciones">×</button></div><p class="notification-feed-status" role="status">Buscando notificaciones recientes…</p><div class="notification-feed-list"></div><label class="notification-sound-control"><input type="checkbox" id="notificationSound" checked> Sonido de notificaciones</label><small id="notificationMoveHint">Mantén presionada la campana para moverla. Con teclado: Alt + flechas.</small></section>`;
  document.body.append(control);
  const bell = control.querySelector('.notification-bell');
  const panel = control.querySelector('section');
  let press = null, timer, suppressClick = false;
  const status = panel.querySelector('.notification-feed-status');
  const list = panel.querySelector('.notification-feed-list');
  let renderedFeed='';
  window.addEventListener('rcc:notifications-update', event => {
    const items=event.detail?.items||[];
    status.textContent=event.detail?.status || (items.length?'Últimas 24 horas':'No tienes notificaciones en las últimas 24 horas.');
    const signature=JSON.stringify(items.map(item=>[item.id,item.message,item.createdAt]));
    if(signature===renderedFeed){positionPanel();return;}
    renderedFeed=signature;list.replaceChildren();
    for(const item of items){
      const entry=document.createElement('button');entry.type='button';entry.className='notification-feed-item';
      const text=document.createElement('span');text.textContent=item.message;
      const time=document.createElement('time');time.dateTime=item.createdAt;time.textContent=new Date(item.createdAt).toLocaleString('es');
      entry.append(text,time);entry.addEventListener('click',()=>{close();window.rccOpenNotificationScript?.(item.scriptId);});list.append(entry);
    }
    positionPanel();
  });
  window.addEventListener('rcc:notifications-error', event => {status.textContent=event.detail.message;positionPanel();});
  window.addEventListener('rcc:notification',()=>{if(panel.hidden){bell.classList.add('has-unread');bell.setAttribute('aria-label','Abrir notificaciones nuevas');}});
  window.addEventListener('rcc:notifications-reset',()=>{bell.classList.remove('has-unread');bell.setAttribute('aria-label','Abrir notificaciones');});
  const margin = 12;
  function positionPanel() {
    if (panel.hidden) return;
    const box = bell.getBoundingClientRect();
    panel.style.left = Math.max(margin, Math.min(box.left, innerWidth - panel.offsetWidth - margin)) + 'px';
    const above = box.top - panel.offsetHeight - margin;
    panel.style.top = Math.max(margin, Math.min(above >= margin ? above : box.bottom + margin, innerHeight - panel.offsetHeight - margin)) + 'px';
  }
  function move(x, y) {
    control.style.left = Math.max(margin, Math.min(x, innerWidth - bell.offsetWidth - margin)) + 'px';
    control.style.top = Math.max(margin, Math.min(y, innerHeight - bell.offsetHeight - margin)) + 'px';
    control.style.bottom = 'auto';
    positionPanel();
  }
  function close(focus = false) {
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
    if (focus) bell.focus();
  }
  function cancelPress() {
    clearTimeout(timer);
    const id = press?.id;
    press = null;
    bell.classList.remove('is-dragging');
    if (id !== undefined && bell.hasPointerCapture(id)) bell.releasePointerCapture(id);
  }
  bell.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick = false;
    const box = bell.getBoundingClientRect();
    press = {id:event.pointerId, x:event.clientX, y:event.clientY, left:box.left, top:box.top, dragging:false};
    bell.setPointerCapture(event.pointerId);
    timer = setTimeout(() => {
      if (!press) return;
      press.dragging = true;
      suppressClick = true;
      bell.classList.add('is-dragging');
    }, 450);
  });
  bell.addEventListener('pointermove', event => {
    if (!press || press.id !== event.pointerId) return;
    const dx = event.clientX - press.x, dy = event.clientY - press.y;
    if (press.dragging) {
      event.preventDefault();
      move(press.left + dx, press.top + dy);
    } else if (Math.hypot(dx, dy) > 10) {
      suppressClick = true;
      cancelPress();
    }
  });
  bell.addEventListener('pointerup', cancelPress);
  bell.addEventListener('pointercancel', () => { suppressClick = true; cancelPress(); });
  bell.addEventListener('lostpointercapture', cancelPress);
  bell.addEventListener('contextmenu', event => event.preventDefault());
  bell.addEventListener('click', event => {
    if (event.detail !== 0 && suppressClick) { event.preventDefault(); suppressClick = false; return; }
    panel.hidden = !panel.hidden;
    bell.setAttribute('aria-expanded', String(!panel.hidden));
    if(!panel.hidden){bell.classList.remove('has-unread');bell.setAttribute('aria-label','Abrir notificaciones');window.dispatchEvent(new Event('rcc:notifications-refresh'));}
    positionPanel();
  });
  bell.addEventListener('keydown', event => {
    const shifts = {ArrowLeft:[-20,0], ArrowRight:[20,0], ArrowUp:[0,-20], ArrowDown:[0,20]};
    if (!event.altKey || !shifts[event.key]) return;
    event.preventDefault();
    const box = bell.getBoundingClientRect(), [dx,dy] = shifts[event.key];
    move(box.left + dx, box.top + dy);
  });
  control.querySelector('.notification-close').addEventListener('click', () => close(true));
  document.addEventListener('pointerdown', event => { if (!control.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(true); });
  window.addEventListener('resize', () => {
    if (control.hidden) return;
    const box = bell.getBoundingClientRect();
    move(box.left, box.top);
  });
  window.addEventListener('blur', cancelPress);
  function syncSession() {
    control.hidden = email.hidden || !email.textContent.trim();
    if (control.hidden) { close(); cancelPress(); bell.classList.remove('has-unread'); list.replaceChildren(); status.textContent='Buscando notificaciones recientes…'; }
  }
  new MutationObserver(syncSession).observe(email, {attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});
  syncSession();
})();
