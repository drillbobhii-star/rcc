(() => {
  "use strict";
  const ADMIN_EMAIL = "drillbobhii@gmail.com";
  const QUICK_REPLIES = [
    "¡Hola! Gracias por contactar con el soporte de RCC. ¿En qué puedo ayudarte?",
    "Ya revisé tu cuenta. Dame un momento mientras verifico los detalles.",
    "Tu membresía RCC Supporter está activa. Voy a revisar la vinculación de Discord.",
    "Para recibir tu rol VIP, primero debes unirte al servidor oficial y después vincular tu cuenta.",
    "Hemos recibido tu reporte. Gracias por ayudarnos a mejorar RCC.",
    "Tu caso ha sido resuelto. ¿Necesitas ayuda con algo más?"
  ];
  const $ = id => document.getElementById(id);
  let client = null, session = null, conversations = [], selected = null;
  let pollTimer = null, presenceTimer = null, busy = false, savingNote = false, lastUserMessageId = null;
  let listMode = "recent", typingSentAt = 0, globalChatEnabled = true;

  function status(message, error = false) {
    $("rccChatAdminStatus").textContent = message;
    $("rccChatAdminStatus").className = "pill " + (error ? "warn" : "ok");
  }
  function errorMessage(error) {
    return String(error?.message || error || "Error desconocido");
  }
  function reportChatError(message) {
    const panel = $("rccChatAdminError");
    if (panel) {
      panel.textContent = message;
      panel.hidden = false;
    }
    status(message, true);
  }
  function clearChatError() {
    const panel = $("rccChatAdminError");
    if (panel) {
      panel.textContent = "";
      panel.hidden = true;
    }
  }
  async function api(path = "", options = {}) {
    if (!session?.access_token) throw new Error("La sesión de administrador expiró.");
    const headers = { Authorization:"Bearer " + session.access_token, ...(options.headers || {}) };
    if (options.body && typeof options.body === "string") headers["Content-Type"] = "application/json";
    const response = await fetch("/api/chat" + path, {
      ...options, headers, cache:"no-store", credentials:"same-origin"
    });
    const rawBody = await response.text();
    let result = {};
    if (rawBody) {
      try { result = JSON.parse(rawBody); }
      catch (_) { result = { error: rawBody.slice(0, 500) }; }
    }
    if (response.status === 401 || response.status === 403) {
      if (response.status === 403) throw new Error(result.error || "Acceso denegado.");
      await client.auth.signOut().catch(() => {});
      location.replace("/index.html");
      throw new Error(result.error || "Sesión expirada.");
    }
    if (!response.ok) throw new Error(result.error || ("HTTP " + response.status + " " + response.statusText));
    return result;
  }
  function node(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function filteredConversations() {
    const q = ($("rccChatSearch").value || "").trim().toLowerCase();
    return conversations.filter(c => {
      const matchesMode = listMode === "active" ? c.is_active === true : true;
      const matchesQuery = !q || [c.email,c.name,c.user_id].join(" ").toLowerCase().includes(q);
      return matchesMode && matchesQuery;
    });
  }
  function renderList() {
    const list = $("rccConversationList");
    list.replaceChildren();
    $("rccActiveCount").textContent = String(conversations.filter(c => c.is_active).length);
    $("rccActiveChatsTab").classList.toggle("active", listMode === "active");
    $("rccRecentChatsTab").classList.toggle("active", listMode === "recent");
    $("rccActiveChatsTab").setAttribute("aria-pressed", String(listMode === "active"));
    $("rccRecentChatsTab").setAttribute("aria-pressed", String(listMode === "recent"));
    const rows = filteredConversations();
    if (!rows.length) {
      list.append(node("div","empty-state",listMode === "active" ? "No hay usuarios activos en este momento." : "No hay chats que coincidan con la búsqueda."));
      return;
    }
    for (const conversation of rows) {
      const button = node("button","rcc-conversation");
      button.type = "button";
      if (selected?.id === conversation.id) button.classList.add("active");
      const avatar = node("div","user-avatar",(conversation.name || conversation.email || "U").slice(0,1).toUpperCase());
      const copy = node("div","");
      copy.style.minWidth = "0";
      copy.append(node("strong","",conversation.name || conversation.email || conversation.user_id));
      copy.append(node("small","",conversation.email || conversation.user_id));
      const preview = String(conversation.last_message_preview || (conversation.enabled ? "Conversación abierta" : "Chat cerrado"));
      const meta = node("small","",preview.slice(0,70));
      meta.style.color = conversation.is_active ? "#6fe0b0" : "var(--muted)";
      copy.append(meta);
      const indicators = node("div","");
      indicators.style.marginLeft = "auto";
      indicators.style.display = "flex";
      indicators.style.flexDirection = "column";
      indicators.style.alignItems = "end";
      if (conversation.is_active) indicators.append(node("small","", "● Activo"));
      if (Number(conversation.unread_count) > 0) {
        const unread = node("span","pill ok",String(conversation.unread_count));
        indicators.append(unread);
      }
      button.append(avatar,copy,indicators);
      button.addEventListener("click",() => void selectConversation(conversation));
      list.append(button);
    }
  }
  function renderMessages(messages) {
    const box = $("rccAdminChatMessages");
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    box.replaceChildren();
    if (!messages.length) {
      box.append(node("div","empty-state","Todavía no hay mensajes. Puedes iniciar la conversación aquí."));
      return;
    }
    for (const message of messages) {
      const mine = message.sender_role === "admin";
      const bubble = node("article","rcc-admin-msg" + (mine ? " mine" : ""));
      if (message.content) bubble.append(document.createTextNode(message.content));
      const readLabel = mine ? (message.read_at ? " · Leído ✓✓" : " · Enviado ✓") : "";
      bubble.append(node("small","",new Date(message.created_at).toLocaleString() + readLabel));
      box.append(bubble);
    }
    if (atBottom) box.scrollTop = box.scrollHeight;
  }
  function setControls() {
    const has = !!selected;
    const banned = selected?.is_banned === true;
    ["rccToggleChat","rccDeleteChat","rccRestrict","rccUnrestrict","rccAdminChatInput","rccQuickReply","rccAdminSend","rccPrivateNote","rccSaveNote"].forEach(id => {
      $(id).disabled = !has;
    });
    $("rccRestrict").hidden = banned;
    $("rccUnrestrict").hidden = !banned;
    $("rccToggleChat").textContent = selected?.enabled ? "Deshabilitar chat" : "Habilitar chat";
    $("rccChatAdminTitle").textContent = selected ? (selected.name || selected.email || selected.user_id) : "Selecciona un usuario";
    $("rccChatAdminSubtitle").textContent = selected ? (selected.email + " · " + selected.user_id) : "Los mensajes privados aparecerán aquí.";
    if (document.activeElement !== $("rccPrivateNote")) $("rccPrivateNote").value = selected?.admin_note || "";
  }
  async function loadConversations() {
    try {
      const result = await api("?action=adminList");
      conversations = result.conversations || [];
      globalChatEnabled = result.globalChatEnabled !== false;
      $("rccGlobalChatToggle").textContent = globalChatEnabled ? "Desactivar chat para todos" : "Activar chat para todos";
      if (selected) {
        const fresh = conversations.find(c => c.id === selected.id);
        if (fresh) selected = fresh;
        else selected = null;
      }
      renderList();
      setControls();
      const preview = $("rccMainMessagePreviewBody");
      if (preview) {
        preview.replaceChildren();
        const latest = conversations[0];
        if (latest) {
          const btn = node("button","small-btn",(latest.name || latest.email || "Usuario RCC") + " · " + (latest.last_message_preview || "Sin mensajes"));
          btn.style.width = "100%";
          btn.addEventListener("click",() => {
            document.querySelector('.admin-tab[data-tab="messages"]')?.click();
            void selectConversation(latest);
          });
          preview.append(btn);
        } else {
          preview.textContent = "Todavía no hay conversaciones.";
        }
      }
      clearChatError();
    } catch (error) {
      reportChatError("Error al cargar conversaciones: " + errorMessage(error));
      throw error;
    }
  }
  async function loadMessages() {
    if (!selected) return;
    try {
      const result = await api("?action=messages&conversationId=" + encodeURIComponent(selected.id));
      renderMessages(result.messages || []);
      $("rccChatAdminTyping").textContent = result.typing?.user ? "El usuario está escribiendo…" : "";
      const latest = [...(result.messages || [])].reverse().find(m => m.sender_role === "user");
      if (latest && latest.id !== lastUserMessageId) {
        if (lastUserMessageId !== null) playIncomingSound();
        lastUserMessageId = latest.id;
      }
      clearChatError();
    } catch (error) {
      reportChatError("Error al cargar mensajes: " + errorMessage(error));
      throw error;
    }
  }
  function playIncomingSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass(), oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.frequency.value = 740; gain.gain.value = 0.035;
      oscillator.connect(gain); gain.connect(ctx.destination);
      oscillator.start(); oscillator.stop(ctx.currentTime + 0.12);
      oscillator.onended = () => ctx.close();
    } catch (_) {}
  }
  async function selectConversation(conversation) {
    selected = conversation;
    lastUserMessageId = null;
    $("rccPrivateNote").value = selected.admin_note || "";
    setControls(); renderList();
    try { await loadMessages(); status("Conversación cargada."); }
    catch(error) { status(error.message,true); }
  }
  async function postAction(payload) {
    return api("", { method:"POST", body:JSON.stringify(payload) });
  }
  async function heartbeat() {
    if (!session?.access_token) return;
    try {
      await postAction({action:"heartbeat"});
    } catch(error) {
      reportChatError("Error de presencia: " + errorMessage(error));
    }
  }
  async function poll() {
    if (busy || !session) return;
    try {
      await loadConversations();
      if (selected) await loadMessages();
    } catch(error) {
      const message = errorMessage(error);
      if (!/Error al cargar (conversaciones|mensajes):/.test(message)) {
        reportChatError("Error al actualizar mensajería: " + message);
      }
    }
  }
  async function sendMessage() {
    if (!selected || busy) return;
    const text = $("rccAdminChatInput").value.trim();
    if (!text) return;
    busy = true; $("rccAdminSend").disabled = true;
    try {
      await postAction({action:"send",conversationId:selected.id,content:text});
      $("rccAdminChatInput").value = "";
      status("Mensaje enviado.");
      await loadMessages();
      await loadConversations();
    } catch(error) { status(error.message,true); }
    finally { busy = false; $("rccAdminSend").disabled = false; }
  }
  async function runAdminAction(action, extra = {}) {
    if (!selected) return;
    const result = await postAction({action,conversationId:selected.id,userId:selected.user_id,...extra});
    await loadConversations();
    return result;
  }
  function showQuickReplies() {
    const menu = $("rccQuickMenu");
    menu.replaceChildren();
    QUICK_REPLIES.forEach(reply => {
      const button = node("button","",reply);
      button.type = "button";
      button.addEventListener("click",() => {
        $("rccAdminChatInput").value = reply;
        menu.hidden = true;
        $("rccAdminChatInput").focus();
      });
      menu.append(button);
    });
    menu.hidden = !menu.hidden;
  }
  async function saveNote() {
    if (!selected || savingNote) return;
    savingNote = true; $("rccSaveNote").disabled = true;
    try {
      await postAction({action:"saveNote",userId:selected.user_id,note:$("rccPrivateNote").value});
      selected.admin_note = $("rccPrivateNote").value;
      status("Nota interna guardada. Solo el Creador puede consultarla.");
    } catch(error) { status(error.message,true); }
    finally { savingNote = false; $("rccSaveNote").disabled = false; }
  }
  async function enablePush(promptUser = true) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      status("Este navegador no admite Web Push. Prueba Chrome, Edge o instala RCC como aplicación compatible.",true);
      return;
    }
    try {
      if (Notification.permission !== "granted" && promptUser) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          status("Permiso de notificaciones no concedido.",true);
          return;
        }
      }
      if (Notification.permission !== "granted") {
        status("Pulsa Activar notificaciones y permite las notificaciones del navegador.",true);
        return;
      }
      const keyData = await api("?action=pushPublicKey");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope:"/" });
      await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const padding = "=".repeat((4 - keyData.publicKey.length % 4) % 4);
        const raw = atob((keyData.publicKey + padding).replace(/-/g,"+").replace(/_/g,"/"));
        const applicationServerKey = Uint8Array.from(raw, c => c.charCodeAt(0));
        subscription = await registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey });
      }
      await postAction({action:"savePush",subscription:subscription.toJSON()});
      $("rccEnablePush").textContent = "Notificaciones activadas ✓";
      status("Notificaciones Push activadas para este dispositivo.");
    } catch(error) {
      status("No se pudieron activar las notificaciones: " + error.message,true);
    }
  }
  async function toggleGlobalChat(){const next=!globalChatEnabled;if(!confirm(next?"¿Activar el chat para todos?":"¿Desactivar el chat para TODOS? Las ventanas abiertas se cerrarán."))return;try{const r=await postAction({action:"setGlobalChat",enabled:next});globalChatEnabled=r.enabled;await poll();status(globalChatEnabled?"Chat global activado.":"Chat desactivado para todos.");}catch(e){status(e.message,true);}}
  async function sendBroadcast() {
    const message = window.prompt("Escribe el anuncio que recibirán todos los usuarios con el chat habilitado:");
    if (!message || !message.trim()) return;
    if (!window.confirm("¿Enviar este mensaje a todos los chats habilitados? Esta acción no se puede deshacer.")) return;
    try {
      const result = await postAction({action:"broadcast",content:message.trim(),confirmed:true});
      status("Anuncio enviado a " + result.delivered + " chats habilitados.");
      await loadConversations();
    } catch(error) { status(error.message,true); }
  }
  function setListMode(mode) {
    listMode = mode;
    renderList();
  }
  async function start() {
    try {
      client = await window.rccAdminSupabaseReady;
      const {data,error} = await client.auth.getSession();
      if (error) throw error;
      session = data.session;
      if (!session?.access_token || session.user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
        location.replace("/index.html"); return;
      }
      await heartbeat();
      presenceTimer = setInterval(() => { void heartbeat(); },25000);
      await poll();
      pollTimer = setInterval(() => { void poll(); },4000);
      if ("Notification" in window) {
        if (Notification.permission === "granted") void enablePush(false);
        else if (Notification.permission === "default") void enablePush(true);
      }
      client.auth.onAuthStateChange((_event,next) => {
        session = next;
        if (!session?.access_token || session.user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
          if (pollTimer) clearInterval(pollTimer);
          if (presenceTimer) clearInterval(presenceTimer);
          location.replace("/index.html");
        }
      });
    } catch(error) {
      reportChatError("No se pudo iniciar el chat: " + errorMessage(error));
    }
  }
  window.addEventListener("error", event => {
    reportChatError("Error de JavaScript: " + errorMessage(event.error || event.message));
  });
  window.addEventListener("unhandledrejection", event => {
    reportChatError("Error de red/API/Supabase: " + errorMessage(event.reason));
  });
  window.addEventListener("pageshow",()=>{if(session)void heartbeat();});
  window.addEventListener("focus",()=>{if(session)void heartbeat();});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&session)void heartbeat();});
  $("rccAdminSend").addEventListener("click",sendMessage);
  $("rccAdminChatInput").addEventListener("keydown",event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  });
  $("rccAdminChatInput").addEventListener("input",() => {
    if (!selected || Date.now() - typingSentAt < 1800) return;
    typingSentAt = Date.now();
    void postAction({action:"typing",conversationId:selected.id}).catch(() => {});
  });
  $("rccQuickReply").addEventListener("click",showQuickReplies);
  $("rccSaveNote").addEventListener("click",saveNote);
  $("rccToggleChat").addEventListener("click",async () => {
    if (!selected) return;
    const wasEnabled = selected.enabled;
    try {
      await runAdminAction("setEnabled",{enabled:!wasEnabled});
      status(wasEnabled ? "Chat deshabilitado." : "Chat habilitado.");
      await loadMessages();
    } catch(error) { status(error.message,true); }
  });
  $("rccDeleteChat").addEventListener("click",async () => {
    if (!selected || !confirm("¿Borrar todo el historial de este chat? Esta acción no se puede deshacer.")) return;
    try {
      await runAdminAction("deleteChat");
      await loadMessages();
      status("Historial eliminado. El chat quedó deshabilitado.");
    } catch(error) { status(error.message,true); }
  });
  $("rccRestrict").addEventListener("click",async () => {
    if (!selected || !confirm("¿Restringir el acceso de este usuario a toda la web RCC?")) return;
    try { await runAdminAction("restrictUser"); status("Acceso restringido."); }
    catch(error) { status(error.message,true); }
  });
  $("rccUnrestrict").addEventListener("click",async () => {
    if (!selected || !confirm("¿Quitar la restricción de esta cuenta?")) return;
    try { await runAdminAction("unrestrictUser"); status("Restricción retirada."); }
    catch(error) { status(error.message,true); }
  });
  $("rccActiveChatsTab").addEventListener("click",() => setListMode("active"));
  $("rccRecentChatsTab").addEventListener("click",() => setListMode("recent"));
  $("rccChatSearch").addEventListener("input",renderList);
  $("rccBroadcast").addEventListener("click",sendBroadcast);
  $("rccGlobalChatToggle").addEventListener("click",toggleGlobalChat);
  $("rccOpenFullMessages")?.addEventListener("click",()=>document.querySelector('.admin-tab[data-tab="messages"]')?.click());
  $("rccEnablePush").addEventListener("click",() => enablePush(true));
  document.querySelector('.admin-tab[data-tab="messages"]')?.addEventListener("click",() => {
    void poll();
    if ("Notification" in window && Notification.permission === "default") void enablePush(true);
  });
  window.addEventListener("pagehide",() => { if (pollTimer) clearInterval(pollTimer); });
  void start();
})();
