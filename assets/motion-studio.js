(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.createElement('div');
  progress.className = 'studio-scroll';
  progress.setAttribute('aria-hidden', 'true');
  const top = document.createElement('button');
  top.className = 'studio-top';
  top.type = 'button';
  top.textContent = '↑';
  top.setAttribute('aria-label', 'Volver al inicio');
  top.hidden = true;
  top.onclick = () => {
    window.scrollTo({top:0, behavior:reduced.matches || document.body.classList.contains('motion-paused') ? 'instant' : 'smooth'});
    const target = document.querySelector('#heroTitle, h1');
    if (target) {target.setAttribute('tabindex', '-1'); target.focus({preventScroll:true});}
  };
  document.body.append(progress, top);
  let scheduled = false;
  function update() {
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1,Math.max(0,scrollY / distance)) : 0})`;
    top.hidden = scrollY < 650;
    scheduled = false;
  }
  window.addEventListener('scroll', () => {if (!scheduled) {scheduled = true; requestAnimationFrame(update);}}, {passive:true});
  window.addEventListener('resize', update, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(document.body);
  update();
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('studio-visible');observer.unobserve(entry.target);}
    }), {threshold:.08});
    document.querySelectorAll('.hero-intro,.motion-feature,.discord-panel,.stats,.personalization,.catalog-heading,.personalization-intro,.support-card,.info-card,body:not([data-ui]) main>h1,body:not([data-ui]) main>section').forEach(el => {el.classList.add('studio-observed');observer.observe(el);});
  }
  document.querySelectorAll('[data-motion-library]').forEach(button => button.addEventListener('click', () => {
    document.getElementById('resetFilters').click();
    document.getElementById('webTab').click();
    const search = document.getElementById('search');
    search.value = 'Movimiento RCC';
    search.dispatchEvent(new Event('input', {bubbles:true}));
    const heading = document.getElementById('catalogHeading');
    heading.scrollIntoView({behavior:reduced.matches || document.body.classList.contains('motion-paused') ? 'instant' : 'smooth',block:'start'});
    heading.focus({preventScroll:true});
  }));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && document.getElementById('search') && !document.querySelector('.modal.open')) {
      event.preventDefault(); document.getElementById('search').focus();
    }
  });
})();
