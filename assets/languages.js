(() => {
  const languages = [
    ['es','🇪🇸','Español'],['en','🇬🇧','English'],['pt','🇧🇷','Português'],
    ['fr','🇫🇷','Français'],['de','🇩🇪','Deutsch'],['it','🇮🇹','Italiano'],
    ['ja','🇯🇵','日本語'],['ko','🇰🇷','한국어'],['zh-CN','🇨🇳','简体中文'],
    ['ar','🇸🇦','العربية'],['hi','🇮🇳','हिन्दी'],['ru','🇷🇺','Русский'],
    ['tr','🇹🇷','Türkçe'],['pl','🇵🇱','Polski'],['nl','🇳🇱','Nederlands'],
    ['id','🇮🇩','Bahasa Indonesia'],['vi','🇻🇳','Tiếng Việt'],['uk','🇺🇦','Українська']
  ];
  const panel = document.getElementById('languagePanel');
  const trigger = document.getElementById('languageTrigger');
  const list = document.getElementById('languageList');
  const status = document.getElementById('languageStatus');
  let loading;
  function close() { panel.hidden = true; trigger.setAttribute('aria-expanded','false'); }
  trigger.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    trigger.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) list.querySelector('[aria-pressed="true"]').focus();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.language-picker')) close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { close(); trigger.focus(); }
  });
  function loadTranslator() {
    if (document.querySelector('.goog-te-combo')) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      let timer;
      let stopped = false;
      const script = document.createElement('script');
      const fail = () => { stopped = true; clearTimeout(timer); script.remove(); loading = null; reject(new Error('translation unavailable')); };
      window.rccTranslateReady = () => {
        new google.translate.TranslateElement({
          pageLanguage: 'es', includedLanguages: languages.map(l => l[0]).join(','), autoDisplay: false
        }, 'translationProvider');
        const poll = () => {
          if (document.querySelector('.goog-te-combo option[value="en"]')) { clearTimeout(timer); resolve(); }
          else if (!stopped) setTimeout(poll, 150);
        };
        poll();
      };
      script.src = 'https://translate.google.com/translate_a/element.js?cb=rccTranslateReady';
      script.onerror = fail;
      timer = setTimeout(fail, 15000);
      document.head.appendChild(script);
    });
    return loading;
  }
  languages.forEach(([code, flag, name]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.lang = code;
    button.textContent = `${flag} ${name}`;
    button.setAttribute('aria-pressed', String(code === 'es'));
    button.addEventListener('click', async () => {
      status.textContent = 'Cargando traducción…';
      list.querySelectorAll('button').forEach(b => b.disabled = true);
      try {
        await loadTranslator();
        const combo = document.querySelector('.goog-te-combo');
        combo.value = code;
        combo.dispatchEvent(new Event('change', { bubbles:true }));
        document.documentElement.lang = code;
        document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
        list.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        trigger.textContent = `${flag} ${name}`;
        status.textContent = 'Traducción automática · Google Translate';
        close(); trigger.focus();
      } catch {
        status.textContent = 'No se pudo cargar Google Translate. Comprueba tu conexión y vuelve a seleccionar un idioma.';
      } finally { list.querySelectorAll('button').forEach(b => b.disabled = false); }
    });
    list.appendChild(button);
  });
})();
