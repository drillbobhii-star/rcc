/* RCC community gift mode.
 * VIP tables, webhook, subscriptions and admin management remain intact.
 * This client intentionally removes every VIP content gate until re-enabled.
 */
(() => {
  'use strict';
  const modal = document.getElementById('rccSubscribeModal');
  const supportButton = document.getElementById('rccSupportButton');
  const vipTab = document.getElementById('vipTab');
  if (supportButton) supportButton.hidden = true;
  if (vipTab) vipTab.hidden = true;
  if (modal) modal.hidden = true;

  const isVipScript = () => false;
  const refreshStatus = async () => {
    decorateCards();
    return true;
  };
  function decorateCards() {
    document.querySelectorAll('[data-script-id]').forEach(card => {
      card.classList.remove('rcc-vip-locked');
      card.querySelector('.rcc-vip-card-gate')?.remove();
      const action = card.querySelector('.card-action');
      if (action && /^🔒 Desbloquear con RCC Supporter$/.test(action.textContent || '')) {
        action.textContent = action.dataset.originalLabel || 'Ver código y copiar ↗';
      }
      card.querySelector('.badges .badge.rcc-vip-badge')?.classList.remove('rcc-vip-badge');
    });
  }
  window.RCCVIP = {
    get isVip() { return true; },
    isVipScript,
    openModal() {},
    refreshStatus,
    percentage: 0,
    communityGiftMode: true,
  };
  window.RCCVIP_PAUSED = true;
  const originalRender = window.render;
  if (typeof originalRender === 'function') {
    window.render = function(...args) {
      const result = originalRender.apply(this, args);
      decorateCards();
      return result;
    };
  }
  document.addEventListener('DOMContentLoaded', decorateCards, { once: true });
  decorateCards();
})();
