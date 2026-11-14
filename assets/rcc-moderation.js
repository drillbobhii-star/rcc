(() => {
  const KEY = "rcc_ai_penalty_v1";
  let interval = null;
  const remaining = () => {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || "null");
      return state && Number.isFinite(state.until) ? Math.max(0, state.until - Date.now()) : 0;
    } catch { return 0; }
  };
  function render() {
    const ms = remaining();
    let overlay = document.getElementById("rccPenaltyOverlay");
    if (!ms) {
      if (overlay) overlay.remove();
      if (interval) clearInterval(interval);
      interval = null;
      try { localStorage.removeItem(KEY); } catch {}
      return;
    }
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "rccPenaltyOverlay";
      overlay.setAttribute("role", "alert");
      overlay.setAttribute("aria-live", "assertive");
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#fff;color:#171717;display:grid;place-content:center;text-align:center;padding:24px;font:16px/1.5 system-ui,sans-serif";
      overlay.innerHTML = '<div style="max-width:440px"><div style="font-size:40px;margin-bottom:12px">⏳</div><h1 style="font-size:24px;margin:0 0 8px">Pausa temporal de RCC</h1><p id="rccPenaltyReason" style="color:#555"></p><strong id="rccPenaltyClock" style="display:block;font-size:32px;font-variant-numeric:tabular-nums;margin-top:16px"></strong><p style="color:#777;font-size:13px;margin-top:16px">La página volverá automáticamente cuando termine el tiempo.</p></div>';
      document.body.appendChild(overlay);
    }
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || "null");
      overlay.querySelector("#rccPenaltyReason").textContent = state?.reason || "Pausa temporal por incumplir las normas de convivencia.";
    } catch {}
    const seconds = Math.ceil(ms / 1000);
    overlay.querySelector("#rccPenaltyClock").textContent = `${Math.floor(seconds / 60).toString().padStart(2,"0")}:${(seconds % 60).toString().padStart(2,"0")}`;
    if (!interval) interval = setInterval(render, 250);
  }
  function apply(seconds, reason) {
    const duration = Math.max(10, Math.min(1800, Math.floor(Number(seconds) || 0)));
    if (!duration) return;
    const until = Date.now() + duration * 1000;
    try {
      const previous = JSON.parse(localStorage.getItem(KEY) || "null");
      localStorage.setItem(KEY, JSON.stringify({ until: Math.max(until, previous?.until || 0), reason: String(reason || "").slice(0,240) }));
    } catch {}
    render();
  }
  window.RCCPenalty = { apply, active: () => remaining() > 0 };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once:true });
  else render();
  window.addEventListener("storage", event => { if (event.key === KEY) render(); });
})();
