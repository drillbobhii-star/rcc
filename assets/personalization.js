/* Browser appearance preferences are optional; unavailable storage never blocks the catalog. */
(() => {
  const presets = {
    ios: {name:'iOS', accent:'#9ec9f5', bg:'#101a26', surface:'#172635', radius:'24px'},
    android: {name:'Android', accent:'#c1d6a4', bg:'#171d16', surface:'#263024', radius:'30px'},
    hyper: {name:'HyperOS', accent:'#edbda1', bg:'#241b20', surface:'#34282d', radius:'20px'},
    nothing: {name:'Nothing', accent:'#f2a69c', bg:'#1c1c1e', surface:'#28282b', radius:'6px'}
  };
  const defaults = {theme:'ios', accent:presets.ios.accent, glass:78, density:'comfortable', motion:true};
  let state = {...defaults};
  try {
    const saved = JSON.parse(localStorage.getItem('rcc_appearance'));
    if (saved && presets[saved.theme]) {
      state.theme = saved.theme;
      state.accent = /^#[0-9a-f]{6}$/i.test(saved.accent) ? saved.accent : presets[saved.theme].accent;
      state.glass = Number.isFinite(saved.glass) ? Math.min(100, Math.max(55, saved.glass)) : 78;
      state.density = saved.density === 'compact' ? 'compact' : 'comfortable';
      state.motion = typeof saved.motion === 'boolean' ? saved.motion : true;
    }
  } catch {}
  const root = document.documentElement;
  const panel = document.getElementById('personalization');
  const trigger = document.getElementById('appearanceToggle');
  const accent = document.getElementById('accentColor');
  const glass = document.getElementById('glassAmount');
  const density = document.getElementById('density');
  const motion = document.getElementById('motionEnabled');
  function apply(save = true) {
    const preset = presets[state.theme];
    document.body.dataset.ui = state.theme;
    document.body.dataset.density = state.density;
    document.body.classList.toggle('ios-glass', state.theme === 'ios');
    document.body.classList.toggle('motion-paused', !state.motion);
    root.style.setProperty('--bg', preset.bg);
    root.style.setProperty('--surface', preset.surface);
    root.style.setProperty('--accent', state.accent);
    root.style.setProperty('--ui-radius', preset.radius);
    root.style.setProperty('--surface-opacity', state.glass + '%');
    accent.value = state.accent; glass.value = state.glass;
    document.getElementById('glassValue').value = state.glass + '%';
    density.value = state.density; motion.checked = state.motion;
    document.querySelectorAll('[data-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === state.theme)));
    let message = 'Estilo ' + preset.name + ' activo.';
    if (save) {
      try { localStorage.setItem('rcc_appearance', JSON.stringify(state)); message += ' Preferencias guardadas.'; }
      catch { message += ' Preferencias aplicadas durante esta visita.'; }
    }
    document.getElementById('appearanceStatus').textContent = message;
  }
  document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
    state.theme = button.dataset.theme; state.accent = presets[state.theme].accent; apply();
  }));
  accent.addEventListener('input', () => { state.accent = accent.value; apply(); });
  glass.addEventListener('input', () => { state.glass = Number(glass.value); apply(); });
  density.addEventListener('change', () => { state.density = density.value; apply(); });
  motion.addEventListener('change', () => { state.motion = motion.checked; apply(); });
  document.getElementById('resetAppearance').addEventListener('click', () => { state = {...defaults}; apply(); });
  trigger.addEventListener('click', () => {
    panel.open = !panel.open;
    if (panel.open) {
      if (typeof closeSidebar === 'function') closeSidebar();
      panel.scrollIntoView({block:'start', behavior:'instant'});
      panel.querySelector('summary').focus({preventScroll:true});
    }
  });
  panel.addEventListener('toggle', () => trigger.setAttribute('aria-expanded', String(panel.open)));
  apply(false);
})();
