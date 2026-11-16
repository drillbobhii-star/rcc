(() => {
  "use strict";
  const host = document.getElementById("panel-users");
  if (!host) return;
  const card = document.createElement("section");
  card.className = "glass-card";
  card.style.marginBottom = "16px";
  card.innerHTML = '<div class="card-head"><div><h2>💬 Mensajes al creador</h2><div class="hint">Controla si los usuarios pueden abrir el chat de soporte desde el perfil oficial.</div></div><span id="creatorMessageState" class="pill muted">Consultando…</span></div><button id="creatorMessageToggle" class="small-btn" type="button" disabled>Cargando…</button><p class="hint" id="creatorMessageHelp" style="margin-top:10px"></p>';
  host.prepend(card);
  const state = card.querySelector("#creatorMessageState"), button = card.querySelector("#creatorMessageToggle"), help = card.querySelector("#creatorMessageHelp");
  let client, token = "", enabled = true;
  async function request(body) {
    const response = await fetch("/api/social", { method: body ? "POST" : "GET", headers: { ...(token ? {Authorization:"Bearer "+token}:{}), ...(body ? {"Content-Type":"application/json"}:{}) }, body: body ? JSON.stringify(body) : undefined, cache:"no-store" });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.error || "No se pudo actualizar el ajuste.");
    return data;
  }
  function render() {
    state.textContent = enabled ? "ACTIVADO" : "DESACTIVADO";
    state.className = "pill " + (enabled ? "ok" : "warn");
    button.textContent = enabled ? "Desactivar recepción de mensajes" : "Activar recepción de mensajes";
    button.disabled = false;
    help.textContent = enabled ? "El botón de soporte aparece activo en el perfil del creador." : "Los visitantes verán que el creador desactivó temporalmente la recepción.";
  }
  async function start() {
    try {
      client = await window.rccAdminSupabaseReady;
      const {data} = await client.auth.getSession();
      token = data.session?.access_token || "";
      if (data.session?.user?.email?.toLowerCase() !== "drillbobhii@gmail.com") throw new Error("Solo el creador puede cambiar este ajuste.");
      const result = await request();
      enabled = result.settings?.creator_messages_enabled !== false;
      render();
    } catch (error) { state.textContent = "Sin acceso"; button.disabled = true; help.textContent = error.message; }
  }
  button.addEventListener("click", async () => {
    button.disabled = true;
    try { const result = await request({action:"setCreatorMessages",enabled:!enabled}); enabled=result.enabled; render(); }
    catch (error) { button.disabled=false; help.textContent=error.message; }
  });
  void start();
})();