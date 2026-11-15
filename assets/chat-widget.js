(() => {
  "use strict";
  const ADMIN_EMAIL = "drillbobhii@gmail.com";
  const MAX_FILE = 10 * 1024 * 1024;
  let client = null, session = null, conversationId = null, enabled = true;
  let panel = null, messagesEl = null, input = null, fileInput = null;
  let pollTimer = null, lastAdminMessage = null, busy = false, chatVisible = false;
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
    const response = await fetch("/api/chat" + path, {
      ...options,
      headers: { Authorization: "Bearer " + session.access_token, ...(options.headers || {}) },
      cache: "no-store",
      credentials: "same-origin"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "No se pudo conectar con soporte.");
    return result;
  }
  function ensureUi() {
    if ($( "rccChatWidget" )) return;
    const style = el("style");
    style.textContent = [
      "#rccChatLauncher{position:fixed;right:22px;bottom:22px;z-index:9500;border:1px solid #ffffff30;border-radius:999px;padding:14px 18px;background:linear-gradient(130deg,#715be0,#2488a5);color:#fff;font:700 14px system-ui;box-shadow:0 12px 38px #0008;cursor:pointer}",
      "#rccChatPanel{position:fixed;right:22px;bottom:86px;width:min(390px,calc(100vw - 24px));height:min(590px,calc(100vh - 120px));z-index:9510;display:flex;flex-direction:column;border:1px solid #a8a5ff42;border-radius:20px;background:rgba(12,15,27,.97);color:#f5f6ff;box-shadow:0 22px 70px #000b;backdrop-filter:blur(22px);overflow:hidden;font-family:Inter,system-ui,sans-serif}",
      "#rccChatPanel[hidden],#rccChatLauncher[hidden]{display:none}",
      ".rcc-chat-head{display:flex;align-items:center;justify-content:space-between;padding:15px;background:linear-gradient(120deg,#48398a,#1b6276);font-weight:800}",
      ".rcc-chat-close{border:0;background:#ffffff20;color:white;border-radius:9px;width:30px;height:30px;font-size:19px;cursor:pointer}",
      "#rccChatMessages{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:radial-gradient(circle at top,rgba(103,87,183,.12),transparent 60%)}",
      ".rcc-chat-bubble{max-width:85%;padding:10px 12px;border-radius:14px;background:#252b43;align-self:flex-start;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.5}",
      ".rcc-chat-bubble.mine{align-self:flex-end;background:#6554bd}",
      ".rcc-chat-bubble small{display:block;color:#c1c8e5;font-size:10px;margin-top:5px}",
      ".rcc-chat-bubble img{display:block;max-width:100%;max-height:190px;border-radius:9px;margin-top:6px}",
      ".rcc-chat-bubble a{color:#a7eaff}",
      ".rcc-chat-composer{padding:11px;border-top:1px solid #ffffff18;display:grid;grid-template-columns:1fr auto;gap:8px}",
      "#rccChatInput{min-width:0;resize:none;height:44px;max-height:100px;border:1px solid #ffffff24;border-radius:11px;background:#11182a;color:#fff;padding:11px;font:13px system-ui}",
      ".rcc-chat-actions{display:flex;gap:6px;align-items:center}",
      ".rcc-chat-actions button{border:0;border-radius:10px;background:#6656c2;color:white;padding:10px;cursor:pointer;font-weight:750}",
      "#rccChatAttach{background:#ffffff18}",
      "#rccChatStatus{font-size:11px;color:#aeb7d5;padding:0 12px 8px;min-height:18px}",
      "#rccChatToast{position:fixed;right:20px;bottom:85px;z-index:9520;padding:12px 16px;background:#242b43;border:1px solid #9e91ff70;border-radius:12px;color:#fff;box-shadow:0 10px 40px #0009;max-width:min(340px,calc(100vw - 40px))}",
      "#rccChatToast[hidden]{display:none}",
      "#rccBanOverlay{position:fixed;inset:0;z-index:2147483000;background:rgba(4,6,13,.98);display:grid;place-items:center;padding:24px;color:#fff;text-align:center;font-family:system-ui,sans-serif}",
      "#rccBanOverlay[hidden]{display:none}",
      "#rccBanOverlay section{max-width:500px;padding:35px;border:1px solid #ff647344;border-radius:22px;background:linear-gradient(145deg,#201725,#101827);box-shadow:0 25px 80px #000a}",
      "#rccBanOverlay h1{font-size:25px;margin:12px 0;color:#ff9ca8}",
      "#rccBanOverlay p{color:#d2d5e6;line-height:1.6}",
      "@media(max-width:520px){#rccChatLauncher{right:14px;bottom:14px}#rccChatPanel{right:8px;bottom:74px;width:calc(100vw - 16px);height:min(76vh,600px)}}"
    ].join("");
    const launcher = el("button", { id:"rccChatLauncher", type:"button", hidden:true }, "✉  Soporte RCC");
    panel = el("section", { id:"rccChatPanel", hidden:true, "aria-label":"Chat de soporte RCC" });
    const head = el("div", { class:"rcc-chat-head" });
    head.append(el("span", {}, "Soporte privado RCC"), el("button", { class:"rcc-chat-close", type:"button", "aria-label":"Cerrar chat" }, "×"));
    messagesEl = el("div", { id:"rccChatMessages", "aria-live":"polite" });
    const composer = el("div", { class:"rcc-chat-composer" });
    input = el("textarea", { id:"rccChatInput", placeholder:"Escribe tu mensaje…", maxlength:"5000" });
    const actions = el("div", { class:"rcc-chat-actions" });
    const attach = el("button", { id:"rccChatAttach", type:"button", title:"Adjuntar archivo" }, "＋");
    const send = el("button", { id:"rccChatSend", type:"button" }, "Enviar");
    fileInput = el("input", { type:"file", hidden:true, accept:"image/*,.pdf,.txt,.csv,.json,.zip,.docx" });
    actions.append(attach, send); composer.append(input, actions);
    const status = el("div", { id:"rccChatStatus", role:"status" });
    panel.append(head, messagesEl, composer, fileInput, status);
    const toast = el("div", { id:"rccChatToast", hidden:true, role:"alert" });
    document.head.append(style); document.body.append(launcher, panel, toast);
    launcher.addEventListener("click", () => setOpen(true));
    head.querySelector("button").addEventListener("click", () => setOpen(false));
    attach.addEventListener("click", () => fileInput.click());
    send.addEventListener("click", sendMessage);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
    });
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.[0]) $("rccChatStatus").textContent = "Adjunto: " + fileInput.files[0].name;
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
  function setOpen(open) {
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
      if (msg.file_url) {
        if ((msg.file_type || "").startsWith("image/")) bubble.append(el("img", { src:msg.file_url, alt:msg.file_name || "Imagen adjunta", loading:"lazy" }));
        bubble.append(el("a", { href:msg.file_url, target:"_blank", rel:"noopener noreferrer" }, "📎 " + (msg.file_name || "Descargar archivo")));
      }
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
    $("rccChatLauncher").hidden = !conversationId;
    if (!enabled && chatVisible) {
      setOpen(false);
      notify("Chat cerrado por el administrador.");
    }
    return state;
  }
  async function poll() {
    if (!session || !conversationId) return;
    try {
      const state = await loadState();
      if (!state) return;
      if (!enabled) { $("rccChatStatus").textContent = "Chat cerrado por el administrador."; return; }
      const result = await request("?action=messages&conversationId=" + encodeURIComponent(conversationId));
      const messages = result.messages || [];
      const newestAdmin = [...messages].reverse().find(message => message.sender_role === "admin");
      if (newestAdmin && newestAdmin.id !== lastAdminMessage) {
        if (lastAdminMessage !== null) {
          notify("Mensaje del Creador");
          setOpen(true);
        }
        lastAdminMessage = newestAdmin.id;
      }
      renderMessages(messages);
      $("rccChatStatus").textContent = "Soporte RCC · " + (messages.length ? "Mensajes protegidos" : "Cuéntanos cómo podemos ayudarte");
    } catch (error) {
      if (/restringida/i.test(error.message)) blockAccount();
      else console.warn("[RCC chat]", error.message);
    }
  }
  async function sendMessage() {
    if (busy || !enabled) return;
    const file = fileInput.files?.[0];
    const text = input.value.trim();
    if (!text && !file) return;
    if (file && file.size > MAX_FILE) { $("rccChatStatus").textContent = "El archivo supera 10 MB."; return; }
    busy = true; $("rccChatSend").disabled = true;
    try {
      const form = new FormData();
      form.set("action", "send");
      form.set("conversationId", conversationId || "");
      form.set("content", text);
      if (file) form.set("file", file, file.name);
      await request("", { method:"POST", body:form });
      input.value = ""; fileInput.value = "";
      $("rccChatStatus").textContent = "Enviado";
      await poll();
    } catch (error) {
      $("rccChatStatus").textContent = error.message;
      if (/restringida/i.test(error.message)) blockAccount();
    } finally {
      busy = false; $("rccChatSend").disabled = false;
    }
  }
  async function initialize() {
    try {
      client = await window.rccSupabaseReady;
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      session = data.session;
      if (!session || session.user?.email?.toLowerCase() === ADMIN_EMAIL) return;
      ensureUi();
      const state = await loadState();
      if (!state) return;
      if (state.conversation?.enabled === false) $("rccChatStatus").textContent = "Chat cerrado por el administrador.";
      await poll();
      pollTimer = setInterval(() => { void poll(); }, 4000);
      client.auth.onAuthStateChange((_event, nextSession) => {
        session = nextSession;
        if (!session) {
          if (pollTimer) clearInterval(pollTimer);
          $("rccChatLauncher")?.remove(); panel?.remove();
          return;
        }
        if (session.user?.email?.toLowerCase() !== ADMIN_EMAIL) void loadState().then(poll);
      });
    } catch (error) {
      console.warn("[RCC chat] No se pudo iniciar el soporte privado:", error.message);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once:true });
  else void initialize();
})();
