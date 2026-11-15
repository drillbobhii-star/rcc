(() => {
  "use strict";
  const ADMIN_EMAIL = "drillbobhii@gmail.com";
  const MAX_FILE = 10 * 1024 * 1024;
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
  let pollTimer = null, busy = false, savingNote = false, lastUserMessageId = null, typingSentAt = 0;
  const elements = [
    "rccConversationList","rccChatAdminTitle","rccChatAdminSubtitle","rccChatAdminMessages",
    "rccChatAdminStatus","rccToggleChat","rccDeleteChat","rccRestrict","rccUnrestrict",
    "rccAdminChatInput","rccAdminChatFile","rccAdminAttach","rccQuickReply","rccAdminSend",
    "rccQuickMenu","rccPrivateNote","rccSaveNote","globalSearch"
  ];
  function status(message, error = false) {
    $("rccChatAdminStatus").textContent = message;
    $("rccChatAdminStatus").className = "pill " + (error ? "warn" : "ok");
  }
  async function api(path = "", options = {}) {
    if (!session?.access_token) throw new Error("La sesión de administrador expiró.");
    const response = await fetch("/api/chat" + path, {
      ...options,
      headers: { Authorization:"Bearer " + session.access_token, ...(options.headers || {}) },
      cache:"no-store",
      credentials:"same-origin"
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      if (response.status === 403) throw new Error(result.error || "Acceso denegado.");
      await client.auth.signOut().catch(() => {});
      location.replace("/index.html");
      throw new Error(result.error || "Sesión expirada.");
    }
    if (!response.ok) throw new Error(result.error || "Error del chat.");
    return result;
  }
  function node(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function filteredConversations() {
    const q = ($("globalSearch")?.value || "").trim().toLowerCase();
    return conversations.filter(c => !q || [c.email,c.name,c.user_id,c.discord_id].join(" ").toLowerCase().includes(q));
  }
  function renderList() {
    const list = $("rccConversationList");
    list.replaceChildren();
    const rows = filteredConversations();
    if (!rows.length) {
      list.append(node("div","empty-state","No hay conversaciones activas que coincidan con la búsqueda."));
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
      const meta = node("small","",conversation.enabled ? (conversation.is_banned ? "Acceso restringido" : "Chat habilitado") : "Chat deshabilitado");
      meta.style.color = conversation.is_banned ? "#ff929e" : conversation.enabled ? "#6fe0b0" : "#ffd27e";
      copy.append(meta);
      button.append(avatar,copy);
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
      if (message.file_url) {
        if ((message.file_type || "").startsWith("image/")) {
          const img = node("img","");
          img.src = message.file_url; img.alt = message.file_name || "Imagen adjunta"; img.loading = "lazy";
          bubble.append(img);
        }
        const a = node("a","", "📎 " + (message.file_name || "Descargar archivo"));
        a.href = message.file_url; a.target = "_blank"; a.rel = "noopener noreferrer";
        bubble.append(a);
      }
      const readLabel = mine ? (message.read_at ? " · Leído ✓✓" : " · Enviado ✓") : "";
      bubble.append(node("small","",new Date(message.created_at).toLocaleString() + readLabel));
      box.append(bubble);
    }
    if (atBottom) box.scrollTop = box.scrollHeight;
  }
  function setControls() {
    const has = !!selected;
    const banned = selected?.is_banned === true;
    ["rccToggleChat","rccDeleteChat","rccRestrict","rccUnrestrict","rccAdminChatInput","rccAdminAttach","rccQuickReply","rccAdminSend","rccPrivateNote","rccSaveNote"].forEach(id => {
      $(id).disabled = !has;
    });
    $("rccRestrict").hidden = banned;
    $("rccUnrestrict").hidden = !banned;
    $("rccToggleChat").textContent = selected?.enabled ? "Deshabilitar chat" : "Habilitar chat";
    $("rccChatAdminTitle").textContent = selected ? (selected.name || selected.email || selected.user_id) : "Selecciona un usuario";
    $("rccChatAdminSubtitle").textContent = selected ? (selected.email + " · " + selected.user_id + (selected.discord_id ? " · Discord " + selected.discord_id : "")) : "Los mensajes privados aparecerán aquí.";
    $("rccPrivateNote").value = selected?.admin_note || "";
  }
  async function loadConversations() {
    const result = await api("?action=adminList");
    conversations = result.conversations || [];
    if (selected) {
      const fresh = conversations.find(c => c.id === selected.id);
      if (fresh) selected = fresh;
      else selected = null;
    }
    renderList();
    setControls();
  }
  async function loadMessages() {
    if (!selected) return;
    const result = await api("?action=messages&conversationId=" + encodeURIComponent(selected.id));
    renderMessages(result.messages || []);
    if (result.typing?.user) status("El usuario está escribiendo…");
    else if (result.enabled === false) status("Chat deshabilitado para el usuario.", true);
    const latest = [...(result.messages || [])].reverse().find(m => m.sender_role === "user");
    if (latest && latest.id !== lastUserMessageId) {
      if (lastUserMessageId !== null) {
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass(), oscillator = ctx.createOscillator(), gain = ctx.createGain();
            oscillator.frequency.value = 740; gain.gain.value = 0.035;
            oscillator.connect(gain); gain.connect(ctx.destination);
            oscillator.start(); oscillator.stop(ctx.currentTime + 0.12);
            oscillator.onended = () => ctx.close();
          }
        } catch (_) {}
      }
      lastUserMessageId = latest.id;
    }
  }
  async function selectConversation(conversation) {
    selected = conversation;
    lastUserMessageId = null;
    setControls(); renderList();
    try { await loadMessages(); status("Conversación cargada."); }
    catch(error) { status(error.message,true); }
  }
  async function formAction(fields, file) {
    const form = new FormData();
    Object.entries(fields).forEach(([key,value]) => form.set(key,String(value)));
    if (file) form.set("file",file,file.name);
    return api("",{method:"POST",body:form});
  }
  async function poll() {
    if (busy || !session) return;
    try {
      await loadConversations();
      if (selected) await loadMessages();
    } catch(error) {
      if (/expiró|acceso denegado/i.test(error.message)) status(error.message,true);
      else console.warn("[RCC Admin Chat]",error.message);
    }
  }
  async function sendMessage() {
    if (!selected || busy) return;
    const text = $("rccAdminChatInput").value.trim();
    const file = $("rccAdminChatFile").files?.[0];
    if (!text && !file) return;
    if (file && file.size > MAX_FILE) { status("El archivo supera el límite de 10 MB.",true); return; }
    busy = true; $("rccAdminSend").disabled = true;
    try {
      await formAction({action:"send",conversationId:selected.id,content:text},file);
      $("rccAdminChatInput").value = ""; $("rccAdminChatFile").value = "";
      status("Mensaje enviado.");
      await loadMessages();
      await loadConversations();
    } catch(error) { status(error.message,true); }
    finally { busy = false; $("rccAdminSend").disabled = false; }
  }
  async function runAdminAction(action, extra = {}) {
    if (!selected) return;
    const result = await formAction({action,conversationId:selected.id,userId:selected.user_id,...extra});
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
      await formAction({action:"saveNote",userId:selected.user_id,note:$("rccPrivateNote").value});
      selected.admin_note = $("rccPrivateNote").value;
      status("Nota interna guardada. Solo el Creador puede consultarla.");
    } catch(error) { status(error.message,true); }
    finally { savingNote = false; $("rccSaveNote").disabled = false; }
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
      await poll();
      pollTimer = setInterval(() => { void poll(); },4000);
      client.auth.onAuthStateChange((_event,next) => {
        session = next;
        if (!session?.access_token || session.user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
          if (pollTimer) clearInterval(pollTimer);
          location.replace("/index.html");
        }
      });
    } catch(error) { status("No se pudo iniciar el chat: " + error.message,true); }
  }
  $("rccAdminSend").addEventListener("click",sendMessage);
  $("rccAdminChatInput").addEventListener("keydown",event => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  });
  $("rccAdminChatInput").addEventListener("input",() => {
    if (!selected || Date.now() - typingSentAt < 1800) return;
    typingSentAt = Date.now();
    void formAction({action:"typing",conversationId:selected.id}).catch(() => {});
  });
  $("rccAdminAttach").addEventListener("click",() => $("rccAdminChatFile").click());
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
    try {
      await runAdminAction("restrictUser");
      status("Acceso restringido. La web del usuario mostrará el bloqueo en la siguiente comprobación.");
    } catch(error) { status(error.message,true); }
  });
  $("rccUnrestrict").addEventListener("click",async () => {
    if (!selected || !confirm("¿Quitar la restricción de esta cuenta?")) return;
    try {
      await runAdminAction("unrestrictUser");
      status("Restricción retirada.");
    } catch(error) { status(error.message,true); }
  });
  $("globalSearch").addEventListener("input",renderList);
  document.querySelector('.admin-tab[data-tab="messages"]')?.addEventListener("click",() => { void poll(); });
  window.addEventListener("pagehide",() => { if (pollTimer) clearInterval(pollTimer); });
  void start();
})();
