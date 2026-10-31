(() => {
  const lettering = document.getElementById('glassLettering');
  const ripples = document.getElementById('glassRipples');
  if (!lettering || !ripples) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = 'button,a,input,textarea,select,summary,label,[role="button"],.card,.sidebar,dialog,.modal,.overlay';
  let resetTimer;
  let activeTouch = null;
  let pending = null;
  let frame = 0;
  let last = null;
  const enabled = () => !reducedMotion.matches && !document.body.classList.contains('motion-paused');
  function stop() {
    activeTouch = null;
    pending = null;
    last = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function drawTrail() {
    frame = 0;
    const point = pending;
    pending = null;
    if (!point || !enabled()) return;
    if (last && Math.hypot(point.x-last.x, point.y-last.y) < 8) return;
    last = point;
    const dot = document.createElement('span');
    dot.className = 'glass-trail';
    dot.style.left = point.x + 'px';
    dot.style.top = point.y + 'px';
    if (ripples.childElementCount >= 40) ripples.firstElementChild.remove();
    ripples.append(dot);
    dot.addEventListener('animationend', () => dot.remove(), {once:true});
    setTimeout(() => dot.remove(), 850);
  }
  document.addEventListener('pointermove', event => {
    if (!event.isPrimary || !enabled()) return;
    if (event.pointerType !== 'mouse' && event.pointerId !== activeTouch) return;
    pending = {x:event.clientX, y:event.clientY};
    if (!frame) frame = requestAnimationFrame(drawTrail);
  }, {passive:true});
  document.addEventListener('pointerup', event => {if (event.pointerId === activeTouch) stop();}, {passive:true});
  document.addEventListener('pointercancel', stop, {passive:true});
  document.documentElement.addEventListener('pointerleave', stop, {passive:true});
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  reducedMotion.addEventListener('change', stop);
  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || !enabled()) return;
    if (event.pointerType !== 'mouse') activeTouch = event.pointerId;
    last = null;
    if (event.target.closest(controls)) return;
    // Observe touches without cancelling scrolling, selection, or catalog actions.
    const ripple = document.createElement('span');
    ripple.className = 'glass-ripple';
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    if (ripples.childElementCount >= 40) ripples.firstElementChild.remove();
    ripples.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), {once:true});
    setTimeout(() => ripple.remove(), 1600);
    lettering.style.setProperty('--glass-x', `${(event.clientX / innerWidth - .5) * 42}px`);
    lettering.style.setProperty('--glass-y', `${(event.clientY / innerHeight - .5) * 32}px`);
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      lettering.style.removeProperty('--glass-x');
      lettering.style.removeProperty('--glass-y');
    }, 500);
  }, {passive:true});
})();
