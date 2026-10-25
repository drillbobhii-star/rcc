(() => {
  const lettering = document.getElementById('glassLettering');
  const ripples = document.getElementById('glassRipples');
  if (!lettering || !ripples) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = 'button,a,input,textarea,select,summary,label,[role="button"],.card,.sidebar,dialog,.modal,.overlay';
  let resetTimer;
  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || reducedMotion.matches ||
        document.body.classList.contains('motion-paused') || event.target.closest(controls)) return;
    // Observe touches without cancelling scrolling, selection, or catalog actions.
    const ripple = document.createElement('span');
    ripple.className = 'glass-ripple';
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    if (ripples.childElementCount >= 6) ripples.firstElementChild.remove();
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
