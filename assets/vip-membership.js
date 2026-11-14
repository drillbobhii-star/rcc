(() => {
  'use strict';
  const VIP_PERCENTAGE = 35;
  const state = { isVip: false, isAdmin: false, checkoutUrl: null, loading: false };
  const modal = document.getElementById('rccSubscribeModal');
  const supportButton = document.getElementById('rccSupportButton');
  const checkoutButton = document.getElementById('rccKofiButton');
  const checkoutStatus = document.getElementById('rccCheckoutStatus');
  let activeScript = null;

  function hashId(value) {
    let hash = 2166136261;
    for (const char of String(value || '')) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function isVipScript(script) {
    return Boolean(script && hashId(script.id) % 100 < VIP_PERCENTAGE);
  }
  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    document.getElementById('rccSubscribeClose')?.focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = document.getElementById('modal')?.classList.contains('open') ? 'hidden' : '';
    supportButton?.focus();
  }
  function syncCheckout() {
    const url = state.checkoutUrl;
    if (checkoutButton) {
      checkoutButton.disabled = !url;
      checkoutButton.textContent = url ? 'Continuar a Ko-fi · $1.99 USD / mes ↗' : 'Enlace de Ko-fi pendiente';
    }
    if (checkoutStatus) {
      checkoutStatus.textContent = url
        ? 'El cobro es mensual y se administra desde Ko-fi. Cancela desde tu cuenta de Ko-fi cuando quieras.'
        : 'El administrador debe configurar RCC_KOFI_MONTHLY_URL con el enlace de la página de membresías de Ko-fi.';
    }
  }
  async function refreshStatus() {
    if (state.loading) return;
    state.loading = true;
    try {
      let headers = {};
      try {
        const client = await window.rccSupabaseReady;
        const { data } = await client.auth.getSession();
        if (data?.session?.access_token) headers.Authorization = 'Bearer ' + data.session.access_token;
      } catch {}
      const response = await fetch('/api/vip-membership', { headers, cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo consultar la membresía.');
      const result = await response.json();
      state.isVip = result.isVip === true;
      state.isAdmin = result.isAdmin === true;
      state.checkoutUrl = typeof result.checkoutUrl === 'string' && /^https:\/\/(?:www\.)?ko-fi\.com\//.test(result.checkoutUrl) ? result.checkoutUrl : null;
    } catch {
      state.isVip = false;
      state.isAdmin = false;
    } finally {
      state.loading = false;
      syncCheckout();
      decorateCards();
    }
  }
  function decorateCards() {
    document.querySelectorAll('[data-script-id]').forEach(card => {
      const locked = isVipScript({ id: card.dataset.scriptId }) && !state.isVip;
      card.classList.toggle('rcc-vip-locked', locked);
      const badge = card.querySelector('.badges .badge.free');
      if (badge && isVipScript({ id: card.dataset.scriptId })) {
        badge.classList.toggle('rcc-vip-badge', true);
        badge.textContent = '💎 VIP';
      }
      let overlay = card.querySelector('.rcc-vip-card-gate');
      if (locked && !overlay) {
        overlay = document.createElement('div');
        overlay.className = 'rcc-vip-card-gate';
        const label = document.createElement('span');
        label.textContent = 'Contenido exclusivo RCC Supporter';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Desbloquear 💎';
        button.onclick = event => { event.stopPropagation(); openModal(); };
        overlay.append(label, button);
        card.append(overlay);
      } else if (!locked && overlay) overlay.remove();
      const action = card.querySelector('.card-action');
      if (action && locked) action.textContent = '🔒 Desbloquear con RCC Supporter';
      else if (action && !locked) action.textContent = action.dataset.originalLabel || action.textContent.replace(/^🔒 Desbloquear con RCC Supporter$/, 'Ver código y copiar ↗');
      if (action && !action.dataset.originalLabel && !locked) action.dataset.originalLabel = action.textContent;
    });
  }
  function applyModalGate(script) {
    if (!script || !isVipScript(script)) return;
    const code = document.getElementById('modalCode');
    if (!code) return;
    const pre = code.closest('pre');
    if (state.isVip) {
      pre?.classList.remove('rcc-vip-code-locked');
      code.textContent = script.code;
      modal?.querySelector('.rcc-vip-modal-gate')?.remove();
      modal?.querySelector('#scriptCopyBtn')?.removeAttribute('disabled');
      modal?.querySelector('#scriptCopyBtn')?.removeAttribute('hidden');
      return;
    }
    code.textContent = '-- 🔒 Código exclusivo RCC Supporter. Suscríbete para desbloquear este script.';
    pre?.classList.add('rcc-vip-code-locked');
    const copy = document.getElementById('scriptCopyBtn');
    if (copy) { copy.disabled = true; copy.hidden = true; }
    modal?.querySelectorAll('.actions button').forEach(button => {
      if (/Descargar/.test(button.textContent)) button.disabled = true;
      if (/¿Qué hace este código\?/.test(button.textContent)) button.hidden = true;
    });
    if (!modal?.querySelector('.rcc-vip-modal-gate')) {
      const gate = document.createElement('section');
      gate.className = 'rcc-vip-modal-gate';
      const heading = document.createElement('strong');
      heading.textContent = 'Este script pertenece a la Zona VIP';
      const copyText = document.createElement('p');
      copyText.textContent = 'Únete a RCC Supporter por $1.99 USD al mes para ver, copiar y descargar su código.';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Apoyar a RCC 💎';
      button.onclick = openModal;
      gate.append(heading, copyText, button);
      const actions = modalBody.querySelector('.actions');
      if (actions) actions.before(gate); else modalBody.append(gate);
    }
  }

  const originalRender = window.render;
  if (typeof originalRender === 'function') {
    window.render = function(...args) {
      const result = originalRender.apply(this, args);
      decorateCards();
      return result;
    };
  }
  const originalOpenScript = window.openScript;
  if (typeof originalOpenScript === 'function') {
    window.openScript = function(script, ...args) {
      activeScript = script;
      const result = originalOpenScript.call(this, script, ...args);
      applyModalGate(script);
      return result;
    };
  }
  for (const method of ['copyCode', 'downloadCurrent']) {
    const original = window[method];
    if (typeof original === 'function') {
      window[method] = function(...args) {
        if (activeScript && isVipScript(activeScript) && !state.isVip) {
          applyModalGate(activeScript);
          openModal();
          return;
        }
        return original.apply(this, args);
      };
    }
  }
  supportButton?.addEventListener('click', openModal);
  document.getElementById('rccSubscribeClose')?.addEventListener('click', closeModal);
  modal?.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal?.classList.contains('open')) closeModal(); });
  checkoutButton?.addEventListener('click', () => {
    if (state.checkoutUrl) window.open(state.checkoutUrl, '_blank', 'noopener,noreferrer');
  });
  window.addEventListener('rcc:session', refreshStatus);
  window.addEventListener('focus', refreshStatus);
  window.RCCVIP = {
    get isVip() { return state.isVip; },
    isVipScript,
    openModal,
    refreshStatus,
    percentage: VIP_PERCENTAGE,
  };
  syncCheckout();
  Promise.resolve(window.rccSessionReady).finally(refreshStatus);
})();