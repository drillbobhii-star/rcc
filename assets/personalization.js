/* Browser appearance preferences are optional; unavailable storage never blocks the catalog. */
(() => {
  const presets = {
    blue: {name:'Azul glass', accent:'#a8cefa', bg:'#0c1727', surface:'#142c46', radius:'24px'},
    black: {name:'Negro glass', accent:'#ffffff', bg:'#090909', surface:'#181818', radius:'24px'},
    ios: {name:'iOS', accent:'#9ec9f5', bg:'#101a26', surface:'#172635', radius:'24px'},
    android: {name:'Android', accent:'#c1d6a4', bg:'#171d16', surface:'#263024', radius:'30px'},
    hyper: {name:'HyperOS', accent:'#edbda1', bg:'#241b20', surface:'#34282d', radius:'20px'},
    nothing: {name:'Nothing', accent:'#f2a69c', bg:'#1c1c1e', surface:'#28282b', radius:'6px'}
  };
  const motionStyles = {logoMotion:['float','orbit','pulse','tilt','bounce','pendulum','wave','flip','spin','zoom','swing','none'],cardMotion:['rise','fade','left','right','zoom','tilt','flip','none'],ambientMotion:['drift','orbit','wave','pulse','pan','none']};
  const defaults = {theme:'black', accent:presets.black.accent, glass:78, density:'comfortable', motion:true, corners:24, scale:100, blur:22, sound:false, volume:25, logoMotion:'float', cardMotion:'rise', ambientMotion:'drift', speed:100, intensity:100};
  let state = {...defaults};
  try {
    const saved = JSON.parse(localStorage.getItem('rcc_appearance'));
    if (saved && presets[saved.theme]) {
      state.theme = saved.theme;
      for (const [key,min,max] of [['corners',4,36],['scale',90,120],['blur',0,36],['volume',0,100],['speed',50,175],['intensity',25,150]]) state[key] = Number.isFinite(saved[key]) ? Math.max(min,Math.min(max,saved[key])) : defaults[key];
      for (const [key, values] of Object.entries(motionStyles)) state[key] = values.includes(saved[key]) ? saved[key] : defaults[key];
      state.sound = saved.sound === true;
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
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function replayPreview() {
    const preview = document.getElementById('motionPreviewCards');
    preview.classList.remove('motion-preview-playing');
    void preview.offsetWidth;
    preview.classList.add('motion-preview-playing');
  }
  function apply(save = true) {
    const preset = presets[state.theme];
    document.body.dataset.ui = state.theme;
    document.body.dataset.density = state.density;
    document.body.classList.toggle('ios-glass', state.theme === 'ios');
    document.body.classList.toggle('motion-paused', !state.motion);
    document.body.dataset.logoMotion = state.logoMotion;
    document.body.dataset.cardMotion = state.cardMotion;
    document.body.dataset.ambientMotion = state.ambientMotion;
    root.style.setProperty('--logo-cycle', (6 / (state.speed / 100)) + 's');
    root.style.setProperty('--ambient-cycle', (24 / (state.speed / 100)) + 's');
    root.style.setProperty('--entry-cycle', (0.65 / (state.speed / 100)) + 's');
    root.style.setProperty('--motion-distance', (8 * state.intensity / 100) + 'px');
    root.style.setProperty('--motion-angle', (8 * state.intensity / 100) + 'deg');
    root.style.setProperty('--motion-scale', 1 + 0.09 * state.intensity / 100);
    for (const key of Object.keys(motionStyles)) document.getElementById(key).value = state[key];
    for (const [id,key] of [['motionSpeed','speed'],['motionIntensity','intensity']]) {
      document.getElementById(id).value = state[key];
      document.getElementById(id+'Value').value = state[key] + '%';
    }
    document.getElementById('motionStatus').textContent = !state.motion ? 'Animaciones desactivadas. Puedes seguir eligiendo estilos.' : reducedMotion.matches ? 'Movimiento reducido del dispositivo activo. Tus estilos quedan guardados.' : 'Movimiento activo. El logo, las tarjetas y el fondo usan tus ajustes.';
    root.style.setProperty('--bg', preset.bg);
    root.style.setProperty('--surface', preset.surface);
    root.style.setProperty('--accent', state.accent);
    root.style.setProperty('--ui-radius', state.corners + 'px');
    root.style.setProperty('--glass-blur', state.blur + 'px');
    root.style.fontSize = state.scale + '%';
    for (const [id,key] of [['cornerAmount','corners'],['textScale','scale'],['blurAmount','blur'],['soundVolume','volume']]) document.getElementById(id).value = state[key];
    document.getElementById('soundEnabled').checked = state.sound;
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
  for (const key of Object.keys(motionStyles)) document.getElementById(key).addEventListener('change', event => {
    if (!motionStyles[key].includes(event.target.value)) return;
    state[key] = event.target.value; apply(); replayPreview();
  });
  for (const [id,key] of [['motionSpeed','speed'],['motionIntensity','intensity']]) document.getElementById(id).addEventListener('input', event => {
    state[key] = Number(event.target.value); apply(); replayPreview();
  });
  document.getElementById('replayMotion').addEventListener('click', replayPreview);
  reducedMotion.addEventListener('change', () => apply(false));
  document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
    state.theme = button.dataset.theme; state.accent = presets[state.theme].accent; apply();
  }));
  accent.addEventListener('input', () => { state.accent = accent.value; apply(); });
  glass.addEventListener('input', () => { state.glass = Number(glass.value); apply(); });
  density.addEventListener('change', () => { state.density = density.value; apply(); });
  motion.addEventListener('change', () => { state.motion = motion.checked; apply(); replayPreview(); });
  for (const [id,key] of [['cornerAmount','corners'],['textScale','scale'],['blurAmount','blur'],['soundVolume','volume']]) document.getElementById(id).addEventListener('input', event => { state[key] = Number(event.target.value); apply(); });
  document.getElementById('soundEnabled').addEventListener('change', event => { state.sound = event.target.checked; apply(); });
  let audio;
  document.addEventListener('click', event => {
    if (!state.sound || !state.volume || !event.isTrusted) return;
    const target = event.composedPath().find(item => item instanceof Element && item.matches('button,summary,a'));
    if (!target) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
      const keys = Object.keys(presets); const base = 180 + keys.indexOf(state.theme) * 65;
      const section = target.closest('#personalization') ? 1 : target.closest('#modal') ? 1.5 : target.closest('.section-tabs') ? 2 : 1.25;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = ['black','nothing'].includes(state.theme) ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(base * section, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(base * section * 0.65, audio.currentTime + 0.11);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(state.volume / 100 * 0.12, audio.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.15);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + 0.17);
    } catch { /* Optional sound never blocks navigation. */ }
  });
  document.getElementById('resetAppearance').addEventListener('click', () => { state = {...defaults}; apply(); replayPreview(); });
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
  replayPreview();
})();
