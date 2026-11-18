/* Inline notification control beside the profile button; feed data remains community-owned. */
(() => {
  const email = document.getElementById('authEmail');
  if (!email) return;
  const control = document.createElement('aside');
  control.className = 'sidebar-section notification-sidebar-section';
  control.hidden = true;
  control.innerHTML = `<button type="button" class="nav-item notification-bell" aria-label="Abrir notificaciones" aria-expanded="false" aria-controls="floatingNotificationPanel" title="Notificaciones"><span class="ico notification-nav-icon" aria-hidden="true">🔔</span><span class="notification-nav-label">Notificaciones</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><section id="floatingNotificationPanel" class="floating-notification-panel" aria-labelledby="floatingNotificationTitle" hidden><div class="notification-panel-heading"><h2 id="floatingNotificationTitle">Notificaciones</h2><button type="button" class="notification-close" aria-label="Cerrar notificaciones">×</button></div><p class="notification-feed-status" role="status">Buscando notificaciones recientes…</p><div class="notification-feed-list"></div><label class="notification-sound-control"><input type="checkbox" id="notificationSound" checked> Sonido de notificaciones</label><label class="notification-sound-choice">Tono de notificación<select id="notificationSoundType"><option value="classic">Clásico</option><option value="soft">Suave</option><option value="pop">Pop</option><option value="digital">Digital</option><option value="bell">Campanita</option></select></label></section>`;
  const recentSection = document.getElementById('recentBtn')?.closest('.sidebar-section');
  if (recentSection) recentSection.insertAdjacentElement('afterend', control);
  else document.getElementById('sidebar')?.prepend(control);
  const bell = control.querySelector('.notification-bell');
  const panel = control.querySelector('section');
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
  function positionPanel() {
    if (panel.hidden) return;
    const box = bell.getBoundingClientRect();
    const width = Math.min(330, innerWidth - 24);
    panel.style.left = Math.max(12, Math.min(box.left, innerWidth - width - 12)) + 'px';
    panel.style.top = Math.max(12, Math.min(box.bottom + 8, innerHeight - panel.offsetHeight - 12)) + 'px';
  }
  function close(focus = false) {
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
    if (focus) bell.focus();
  }
  bell.addEventListener('click', event => {
    panel.hidden = !panel.hidden;
    bell.setAttribute('aria-expanded', String(!panel.hidden));
    if(!panel.hidden){bell.classList.remove('has-unread');bell.setAttribute('aria-label','Abrir notificaciones');window.dispatchEvent(new Event('rcc:notifications-refresh'));}
    positionPanel();
  });
  control.querySelector('.notification-close').addEventListener('click', () => close(true));
  document.addEventListener('pointerdown', event => { if (!control.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) close(true); });
  window.addEventListener('resize', positionPanel);
  function syncSession() {
    control.hidden = email.hidden || !email.textContent.trim();
    if (control.hidden) { close(); bell.classList.remove('has-unread'); list.replaceChildren(); status.textContent='Buscando notificaciones recientes…'; }
  }
  new MutationObserver(syncSession).observe(email, {attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true});
  syncSession();
})();
