(() => {
  'use strict';
  const VIP_PERCENTAGE = 35;
  const DEFAULT_CHECKOUT_URL = 'https://ko-fi.com/lubensdrill/tiers';
  const state = { isVip: false, isAdmin: false, checkoutUrl: DEFAULT_CHECKOUT_URL, loading: false };
  const modal = document.getElementById('rccSubscribeModal');
  const supportButton = document.getElementById('rccSupportButton');
  const checkoutButton = document.getElementById('rccKofiButton');
  const checkoutStatus = document.getElementById('rccCheckoutStatus');
  const scriptModal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
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
  let statusRequestId = 0;

  async function refreshStatus(sessionOverride) {
    // Never drop a refresh: auth events can arrive while an earlier query is pending.
    const requestId = ++statusRequestId;
    state.loading = true;
    try {
      const client = await window.rccSupabaseReady;
      let session;
      if (arguments.length > 0) {
        // onAuthStateChange supplies the authoritative session, including null on sign-out.
        session = sessionOverride;
      } else {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        session = data?.session || null;
      }

      if (requestId !== statusRequestId) return;
      state.isVip = false;
      decorateCards();
      if (activeScript) applyModalGate(activeScript);
      const user = session?.user || null;
      const headers = session?.access_token
        ? { Authorization: 'Bearer ' + session.access_token }
        : {};

      // Reset immediately for signed-out accounts; never retain a previous user's VIP flag.
      let isVip = false;
      if (user?.id) {
        const { data: membership, error: membershipError } = await client
          .from('rcc_vip_memberships')
          .select('is_vip')
          .eq('user_id', user.id)
          .maybeSingle();
        if (membershipError) throw membershipError;
        isVip = membership?.is_vip === true;
      }

      if (requestId !== statusRequestId) return;
      state.isVip = isVip;
      decorateCards();
      if (activeScript) applyModalGate(activeScript);

      // Checkout configuration must never revoke a confirmed membership.
      const response = await fetch('/api/vip-membership', { headers, cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo consultar la configuración de membresía.');
      const result = await response.json();

      // Ignore stale responses if a newer sign-in/sign-out event has already started.
      if (requestId !== statusRequestId) return;
      state.isVip = isVip;
      state.isAdmin = result.isAdmin === true;
      state.checkoutUrl = typeof result.checkoutUrl === 'string' && /^https:\/\/(?:www\.)?ko-fi\.com\//.test(result.checkoutUrl) ? result.checkoutUrl : DEFAULT_CHECKOUT_URL;
    } catch (error) {
      if (requestId !== statusRequestId) return;
      console.error('[RCC VIP] No se pudo actualizar el estado:', error);
      state.isAdmin = false;
    } finally {
      if (requestId === statusRequestId) {
        state.loading = false;
        syncCheckout();
        decorateCards();
        if (activeScript) applyModalGate(activeScript);
      }
    }
  }

  async function initializeAuthListener() {
    try {
      const client = await window.rccSupabaseReady;
      // Subscribe before the initial read so sign-in changes cannot be missed.
      let currentUserId = null;
      const { data, error } = client.auth.onAuthStateChange((_event, session) => {
        ++statusRequestId;
        const nextUserId = session?.user?.id || null;
        if (nextUserId !== currentUserId) {
          currentUserId = nextUserId;
          // Do not briefly expose the previous account's VIP state after an account switch/sign-out.
          state.isVip = false;
          decorateCards();
          if (activeScript) applyModalGate(activeScript);
        }
        // Defer Supabase queries outside the auth callback to avoid blocking its internal lock.
        setTimeout(() => { void refreshStatus(session); }, 0);
      });
      if (error) throw error;
      window.rccVipAuthSubscription = data?.subscription || null;
      await refreshStatus();
    } catch (error) {
      console.error('[RCC VIP] No se pudo inicializar la sesión:', error);
      await refreshStatus(null);
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
      scriptModal?.querySelector('.rcc-vip-modal-gate')?.remove();
      scriptModal?.querySelector('#scriptCopyBtn')?.removeAttribute('disabled');
      scriptModal?.querySelector('#scriptCopyBtn')?.removeAttribute('hidden');
      scriptModal?.querySelectorAll('.actions button').forEach(button => {
        if (/Descargar/.test(button.textContent)) button.disabled = false;
        if (/¿Qué hace este código\?/.test(button.textContent)) button.hidden = false;
      });
      return;
    }
    code.textContent = '-- 🔒 Código exclusivo RCC Supporter. Suscríbete para desbloquear este script.';
    pre?.classList.add('rcc-vip-code-locked');
    const copy = document.getElementById('scriptCopyBtn');
    if (copy) { copy.disabled = true; copy.hidden = true; }
    scriptModal?.querySelectorAll('.actions button').forEach(button => {
      if (/Descargar/.test(button.textContent)) button.disabled = true;
      if (/¿Qué hace este código\?/.test(button.textContent)) button.hidden = true;
    });
    if (!scriptModal?.querySelector('.rcc-vip-modal-gate')) {
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
  window.addEventListener('rcc:session', () => { void refreshStatus(); });
  window.addEventListener('focus', () => { void refreshStatus(); });
  window.RCCVIP = {
    get isVip() { return state.isVip; },
    isVipScript,
    openModal,
    refreshStatus,
    percentage: VIP_PERCENTAGE,
  };
  syncCheckout();
  void initializeAuthListener();
})();