(() => {
  "use strict";
  const ADMIN_EMAIL = "drillbobhii@gmail.com";
  let client = null, session = null, conversationId = null, enabled = true;
  let panel = null, messagesEl = null, input = null;
  let pollTimer = null, presenceTimer = null, lastAdminMessage = null, busy = false, chatVisible = false, typingTimer = null, typingLastSent = 0, activeUserId = null, globalChatEnabled = true;
  const $ = id => document.getElementById(id);

  function el(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "hidden") node.hidden = !!value;
      else node.setAttribute(key, value);
    });
    if (text) node.textContent = text;
    return node;
  }
  async function request(path = "", options = {}) {
    if (!session?.access_token) throw new Error("Inicia sesión para usar soporte.");
    const headers = { Authorization:"Bearer " + session.access_token, ...(options.headers || {}) };
    if (options.body && typeof options.body === "string") headers["Content-Type"] = "application/json";
    const response = await fetch("/api/chat" + path, {
      ...options, headers, cache:"no-store", credentials:"same-origin"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo conectar con soporte.");
    return result;
  }
  function ensureUi() {
    if ($("rccChatLauncher")) return;
    const style = el("style");
    style.textContent = [
      "#rccChatLauncher{position:fixed;left:22px;bottom:22px;z-index:9500;border:1px solid #ffffff30;border-radius:999px;padding:14px 18px;background:linear-gradient(130deg,#715be0,#2488a5);color:#fff;font:700 14px system-ui;box-shadow:0 12px 38px #0008;cursor:pointer}",
      "#rccChatPanel{position:fixed;left:22px;bottom:86px;width:min(390px,calc(100vw - 24px));height:min(590px,calc(100vh - 120px));z-index:9510;display:flex;flex-direction:column;border:1px solid #a8a5ff42;border-radius:20px;background:rgba(12,15,27,.97);color:#f5f6ff;box-shadow:0 22px 70px #000b;backdrop-filter:blur(22px);overflow:hidden;font-family:Inter,system-ui,sans-serif}",
      "#rccChatPanel[hidden],#rccChatLauncher[hidden]{display:none}",
      ".rcc-chat-head{display:flex;align-items:center;justify-content:space-between;padding:15px;background:linear-gradient(120deg,#48398a,#1b6276);font-weight:800}",
      ".rcc-chat-close{border:0;background:#ffffff20;color:white;border-radius:9px;width:30px;height:30px;font-size:19px;cursor:pointer}",
      "#rccChatMessages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:radial-gradient(circle at top,rgba(103,87,183,.12),transparent 60%)}",
      ".rcc-chat-bubble{max-width:85%;padding:10px 12px;border-radius:14px;background:#252b43;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.5}",
      ".rcc-chat-bubble.mine{align-self:flex-end;background:#6554bd}",
      ".rcc-chat-bubble small{display:block;color:#c1c8e5;font-size:10px;margin-top:5px}",
      ".rcc-chat-composer{padding:11px;border-top:1px solid #ffffff18;display:grid;grid-template-columns:1fr auto;gap:8px}",
      "#rccChatInput{min-width:0;resize:none;height:44px;max-height:100px;border:1px solid #ffffff24;border-radius:11px;background:#11182a;color:#fff;padding:11px;font:13px system-ui}",
      ".rcc-chat-actions button{border:0;border-radius:10px;background:#6656c2;color:white;padding:10px;cursor:pointer;font-weight:750}",
      "#rccGlobalChatOverlay{position:fixed;left:22px;bottom:86px;width:min(390px,calc(100vw - 24px));height:min(590px,calc(100vh - 120px));z-index:9515;display:grid;place-items:center;background:rgba(12,15,27,.76);backdrop-filter:blur(18px);border:1px solid #a8a5ff42;border-radius:20px;color:#fff;text-align:center;padding:24px;font:700 20px system-ui;box-shadow:0 22px 70px #000b}#rccGlobalChatOverlay[hidden]{display:none}#rccGlobalChatOverlay span{display:block;font-size:13px;color:#c7cce0;margin-top:8px;font-weight:500}#rccChatPushEnable{font-size:11px;background:#25334b;padding:7px 9px;margin:0 11px 8px;border:1px solid #ffffff25;border-radius:9px;color:#dce5ff;cursor:pointer}",
      "#rccChatStatus{font-size:11px;color:#aeb7d5;padding:0 12px 8px;min-height:18px}",
      "#rccChatToast{position:fixed;left:20px;bottom:85px;z-index:9520;padding:12px 16px;background:#242b43;border:1px solid #9e91ff70;border-radius:12px;color:#fff;box-shadow:0 10px 40px #0009;max-width:min(340px,calc(100vw - 40px))}",
      "#rccChatToast[hidden]{display:none}",
      "#rccBanOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(4,6,13,.98);display:grid;place-items:center;padding:24px;color:#fff;text-align:center;font-family:system-ui,sans-serif}",
      "#rccBanOverlay[hidden]{display:none}",
      "#rccBanOverlay section{max-width:500px;padding:35px;border:1px solid #ff647344;border-radius:22px;background:linear-gradient(145deg,#201725,#101827);box-shadow:0 25px 80px #000a}",
      "#rccBanOverlay h1{font-size:25px;margin:12px 0;color:#ff9ca8}",
      "#rccBanOverlay p{color:#d2d5e6;line-height:1.6}",
      "@media(max-width:520px){#rccChatLauncher{left:14px;bottom:14px}#rccChatPanel{left:8px;bottom:74px;width:calc(100vw - 16px);height:min(76vh,600px)}}"
    ].join("");
    const launcher = el("button", { id:"rccChatLauncher", type:"button", hidden:true }, "✉  RCC Mensajes");
    panel = el("section", { id:"rccChatPanel", hidden:true, "aria-label":"Chat de mensajes RCC" });
    const head = el("div", { class:"rcc-chat-head" });
    head.append(el("span", {}, "Mensajes privados RCC"), el("button", { class:"rcc-chat-close", type:"button", "aria-label":"Cerrar chat" }, "×"));
    messagesEl = el("div", { id:"rccChatMessages", "aria-live":"polite" });
    const composer = el("div", { class:"rcc-chat-composer" });
    input = el("textarea", { id:"rccChatInput", placeholder:"Escribe tu mensaje…", maxlength:"5000" });
    const actions = el("div", { class:"rcc-chat-actions" });
    const send = el("button", { id:"rccChatSend", type:"button" }, "Enviar");
    actions.append(send); composer.append(input, actions);
    const status = el("div", { id:"rccChatStatus", role:"status" });
    const pushButton=el("button",{id:"rccChatPushEnable",type:"button"},"Activar notificaciones en este dispositivo");pushButton.addEventListener("click",enableUserPush);
    panel.append(head,messagesEl,composer,pushButton,status);
    const toast = el("div", { id:"rccChatToast", hidden:true, role:"alert" });
    const globalOverlay=el("div",{id:"rccGlobalChatOverlay",hidden:true,role:"status"});const overlayCard=el("div");overlayCard.append(el("div",{},"✉"),el("div",{},"Creador desactivó el chat"),el("span",{},"La mensajería está temporalmente pausada para todos."));globalOverlay.append(overlayCard);
    document.head.append(style); document.body.append(launcher,panel,toast,globalOverlay);
    launcher.addEventListener("click", () => setOpen(true));
    head.querySelector("button").addEventListener("click", () => setOpen(false));
    send.addEventListener("click", sendMessage);
    input.addEventListener("input", () => {
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { void sendTyping(); }, 250);
    });
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
    });
  }
  function notify(text) {
    const toast = $("rccChatToast");
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => { toast.hidden = true; }, 5200);
  }
  async function enableUserPush(){try{if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))throw new Error("Este navegador no admite Push.");if(Notification.permission!=="granted"&&await Notification.requestPermission()!=="granted")throw new Error("No se concedió permiso.");const key=await request("?action=pushPublicKey");const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();if(!sub){const raw=atob((key.publicKey+"=".repeat((4-key.publicKey.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}await request("",{method:"POST",body:JSON.stringify({action:"savePush",subscription:sub.toJSON()})});$("rccChatPushEnable").textContent="Notificaciones activadas ✓";}catch(e){notify(e.message);}}
  async function ensureConversation() {
    if (conversationId) return;
    const result = await request("", { method:"POST", body:JSON.stringify({action:"ensureConversation"}) });
    conversationId = result.id;
    enabled = result.enabled === true;
  }
  async function setOpen(open) {
    if (open && (!enabled || !globalChatEnabled)) { notify(globalChatEnabled ? "Chat cerrado por el administrador." : "Creador desactivó el chat."); return; }
    if (open && !conversationId) {
      try { await ensureConversation(); }
      catch (error) { notify(error.message); return; }
    }
    chatVisible = open;
    if (panel) panel.hidden = !open;
    if (open) { input?.focus(); void poll(); }
  }
  function blockAccount() {
    if ($("rccBanOverlay")) return;
    const overlay = el("div", { id:"rccBanOverlay", role:"alertdialog", "aria-modal":"true" });
    const card = el("section");
    card.append(el("div", {}, "⛔"), el("h1", {}, "Tu cuenta ha sido restringida."), el("p", {}, "Contacta al soporte de RCC para obtener más información."));
    overlay.append(card);
    document.body.append(overlay);
    document.documentElement.style.overflow = "hidden";
    if ($("rccChatLauncher")) $("rccChatLauncher").hidden = true;
    if (panel) panel.hidden = true;
  }
  function renderMessages(messages) {
    const wasAtBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;
    messagesEl.replaceChildren();
    for (const msg of messages) {
      const bubble = el("article", { class:"rcc-chat-bubble" + (msg.sender_role === "user" ? " mine" : "") });
      if (msg.content) bubble.append(document.createTextNode(msg.content));
      bubble.append(el("small", {}, new Date(msg.created_at).toLocaleString()));
      messagesEl.append(bubble);
    }
    if (wasAtBottom || chatVisible) messagesEl.scrollTop = messagesEl.scrollHeight;
  }
  async function loadState() {
    const state = await request("?action=state");
    if (state.isBanned) { blockAccount(); return null; }
    conversationId = state.conversation?.id || null;
    enabled = state.conversation?.enabled !== false;
    globalChatEnabled = state.globalChatEnabled !== false;
    $("rccGlobalChatOverlay").hidden = globalChatEnabled;
    $("rccChatLauncher").hidden = false;
    if ((!enabled || !globalChatEnabled) && chatVisible) {
      await setOpen(false);
      notify(globalChatEnabled ? "Chat cerrado por el administrador." : "Creador desactivó el chat.");
    }
    return state;
  }
  async function heartbeat() {
    if (!session?.access_token || session.user?.email?.toLowerCase() === ADMIN_EMAIL) return;
    try { await request("", { method:"POST", body:JSON.stringify({action:"heartbeat"}) }); } catch (error) { console.warn("[RCC presence]", error.message); }
  }
  async function sendTyping() {
    if (!conversationId || !enabled || Date.now() - typingLastSent < 1800) return;
    typingLastSent = Date.now();
    try {
      await request("", { method:"POST", body:JSON.stringify({action:"typing",conversationId}) });
    } catch (_) {}
  }
  async function poll() {
    if (!session) return;
    try {
      const state = await loadState();
      if (!state) return;
      if (!conversationId) return;
      if (!globalChatEnabled) { $("rccChatStatus").textContent = "Creador desactivó el chat."; return; }
      if (!enabled) { $("rccChatStatus").textContent = "Chat cerrado por el administrador."; return; }
      const result = await request("?action=messages&conversationId=" + encodeURIComponent(conversationId));
      const messages = result.messages || [];
      const newestAdmin = [...messages].reverse().find(message => message.sender_role === "admin");
      if (newestAdmin && newestAdmin.id !== lastAdminMessage) {
        if (lastAdminMessage !== null || !newestAdmin.read_at) {
          notify("Mensaje del Creador");
          void setOpen(true);
        }
        lastAdminMessage = newestAdmin.id;
      }
      renderMessages(messages);
      $("rccChatStatus").textContent = result.typing?.admin
        ? "El Creador está escribiendo…"
        : "RCC Mensajes · " + (messages.length ? "Conversación privada" : "Escríbenos cuando lo necesites");
    } catch (error) {
      if (/restringida/i.test(error.message)) blockAccount();
      else console.warn("[RCC chat]", error.message);
    }
  }
  async function sendMessage() {
    if (busy || !enabled || !globalChatEnabled) return;
    const text = input.value.trim();
    if (!text) return;
    if (!conversationId) {
      try { await ensureConversation(); }
      catch (error) { $("rccChatStatus").textContent = error.message; return; }
    }
    busy = true; $("rccChatSend").disabled = true;
    try {
      await request("", { method:"POST", body:JSON.stringify({action:"send",conversationId,content:text}) });
      input.value = "";
      $("rccChatStatus").textContent = "Enviado";
      await poll();
    } catch (error) {
      $("rccChatStatus").textContent = error.message;
      if (/restringida/i.test(error.message)) blockAccount();
    } finally {
      busy = false; $("rccChatSend").disabled = false;
    }
  }
  async function activateSession(nextSession) {
    session = nextSession;
    if (!session || session.user?.email?.toLowerCase() === ADMIN_EMAIL) {
      if (pollTimer) clearInterval(pollTimer);
      if (presenceTimer) clearInterval(presenceTimer);
      pollTimer = null; presenceTimer = null; activeUserId = null; conversationId = null;
      $("rccChatLauncher")?.remove(); panel?.remove(); $("rccChatToast")?.remove();
      return;
    }
    if (activeUserId === session.user.id && $("rccChatLauncher")) return;
    activeUserId = session.user.id;
    ensureUi();
    await heartbeat();
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => { void heartbeat(); }, 25000);
    const state = await loadState();
    if (!state) return;
    $("rccChatStatus").textContent = state.conversation?.enabled === false
      ? "Chat cerrado por el administrador."
      : "RCC Mensajes · Puedes escribirnos.";
    await poll();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { void poll(); }, 4000);
  }
  window.addEventListener("pageshow", () => { if (session) void heartbeat(); });
  window.addEventListener("focus", () => { if (session) void heartbeat(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && session) void heartbeat(); });
  async function initialize() {
    try {
      client = await window.rccSupabaseReady;
      client.auth.onAuthStateChange((_event, nextSession) => {
        Promise.resolve().then(() => activateSession(nextSession)).catch(error => console.warn("[RCC chat]", error.message));
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await activateSession(data.session);
    } catch (error) {
      console.warn("[RCC chat] No se pudo iniciar el soporte privado:", error.message);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once:true });
  else void initialize();
})();
