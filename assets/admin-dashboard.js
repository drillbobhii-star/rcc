(() => {
  "use strict";

  const ADMIN_EMAIL = "drillbobhii@gmail.com";
  const $ = (id) => document.getElementById(id);
  const boot = $("adminBoot");
  const shell = $("rccAdminShell");
  const statusEl = $("adminStatus");
  let supabaseClient = null;
  let session = null;
  let dashboard = { users: [], stats: {}, capabilities: {} };
  let activeTab = "users";
  let refreshing = false;
  let refreshTimer = null;

  function setStatus(message, isError = false) {
    statusEl.textContent = message || "";
    statusEl.classList.toggle("error", isError);
  }

  function showBoot(message) {
    boot.hidden = false;
    shell.hidden = true;
    boot.querySelector("strong").textContent = message;
  }

  function safeText(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function initials(name, email) {
    const source = (name || email || "RCC").trim();
    return source.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join("") || "R";
  }

  function makeUserCell(user) {
    const wrap = document.createElement("div");
    wrap.className = "user-cell";
    if (user.avatar_url) {
      const image = document.createElement("img");
      image.className = "user-avatar";
      image.src = user.avatar_url;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.onerror = () => {
        const fallback = document.createElement("div");
        fallback.className = "user-avatar";
        fallback.textContent = initials(user.name, user.email);
        image.replaceWith(fallback);
      };
      wrap.append(image);
    } else {
      const avatar = document.createElement("div");
      avatar.className = "user-avatar";
      avatar.textContent = initials(user.name, user.email);
      wrap.append(avatar);
    }
    const details = document.createElement("div");
    details.className = "user-main";
    const name = document.createElement("strong");
    name.textContent = user.name || user.email || "Usuario RCC";
    const email = document.createElement("small");
    email.textContent = user.email || "Sin correo";
    details.append(name, email);
    wrap.append(details);
    return wrap;
  }

  async function api(path = "", options = {}) {
    if (!session?.access_token) throw new Error("La sesión de administrador expiró.");
    const headers = { Authorization: "Bearer " + session.access_token, ...(options.headers || {}) };
    if (options.body) headers["Content-Type"] = "application/json";
    const response = await fetch("/api/admin-dashboard" + path, {
      ...options,
      headers,
      cache: "no-store",
      credentials: "same-origin"
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      await supabaseClient.auth.signOut().catch(() => {});
      window.location.replace("/index.html");
      throw new Error(data.error || "Acceso denegado.");
    }
    if (!response.ok) throw new Error(data.error || "No se pudo completar la operación.");
    return data;
  }

  function searchableUser(user) {
    return [user.email, user.user_id, user.discord_id, user.name].join(" ").toLowerCase();
  }

  function filterText() {
    return $("globalSearch").value.trim().toLowerCase();
  }

  function renderSwitch(user, field, label, disabled = false) {
    const wrap = document.createElement("label");
    wrap.className = "switch-label";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = user[field] === true;
    input.disabled = disabled;
    input.title = disabled ? "La columna " + field + " no aparece en el esquema actual de profiles." : "Actualizar " + label;
    input.addEventListener("change", async () => {
      const before = !input.checked;
      input.disabled = true;
      try {
        await api("", {
          method: "POST",
          body: JSON.stringify({ action: "setFlag", userId: user.user_id, field, value: input.checked })
        });
        user[field] = input.checked;
        setStatus(label + " actualizado para " + (user.email || user.user_id) + ".");
        await loadDashboard(true);
      } catch (error) {
        input.checked = before;
        setStatus(error.message, true);
      } finally {
        input.disabled = disabled;
      }
    });
    const text = document.createElement("span");
    text.textContent = label;
    wrap.append(input, text);
    return wrap;
  }

  let userQuickMenu = null;
  let userHoldTimer = null;
  let userHoldTriggered = false;

  function closeUserQuickMenu() {
    if (userQuickMenu) userQuickMenu.hidden = true;
  }

  async function adminChatRequest(payload) {
    if (!session?.access_token) throw new Error("La sesión de administrador expiró.");
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
      credentials: "same-origin", cache: "no-store", body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "No se pudo completar la acción de chat.");
    return data;
  }

  function quickActionButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className || "small-btn";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  async function ensureAdminConversation(userId) {
    return adminChatRequest({ action: "adminEnsureConversation", userId });
  }

  function openUserQuickMenu(user) {
    if (!userQuickMenu) {
      userQuickMenu = document.createElement("div");
      userQuickMenu.className = "rcc-user-quick-menu";
      userQuickMenu.hidden = true;
      userQuickMenu.setAttribute("role", "presentation");
      userQuickMenu.addEventListener("click", event => {
        if (event.target === userQuickMenu) closeUserQuickMenu();
      });
      const card = document.createElement("section");
      card.className = "rcc-user-quick-card";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-label", "Acciones del usuario");
      userQuickMenu.append(card);
      document.body.append(userQuickMenu);
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeUserQuickMenu();
      });
    }
    const card = userQuickMenu.firstElementChild;
    card.replaceChildren();
    const head = document.createElement("div");
    head.className = "rcc-user-quick-head";
    const title = document.createElement("h3");
    title.textContent = "Acciones · " + (user.name || user.email || user.user_id);
    const close = document.createElement("button");
    close.type = "button"; close.className = "small-btn"; close.textContent = "Cerrar";
    close.addEventListener("click", closeUserQuickMenu);
    head.append(title, close); card.append(head);


    const discord = document.createElement("div");
    discord.className = "rcc-user-quick-section";
    const discordTitle = document.createElement("strong");
    discordTitle.textContent = "Discord";
    const discordInfo = document.createElement("p");
    discordInfo.className = "rcc-user-quick-hint";
    discordInfo.textContent = user.discord_id ? "Vinculado: " + user.discord_id : "Esta cuenta no tiene Discord vinculado.";
    const discordActions = document.createElement("div");
    discordActions.className = "rcc-user-quick-actions";
    if (user.discord_id) {
      const unlink = document.createElement("button");
      unlink.type = "button"; unlink.className = "small-btn danger"; unlink.textContent = "Desvincular Discord";
      unlink.addEventListener("click", async () => { await unlinkDiscord(user, unlink); closeUserQuickMenu(); });
      discordActions.append(unlink);
    }
    discord.append(discordTitle, discordInfo, discordActions);
    card.append(discord);

    const messaging = document.createElement("div");
    messaging.className = "rcc-user-quick-section";
    const messagingTitle = document.createElement("strong");
    messagingTitle.textContent = "RCC Mensajes · contacto directo";
    const composer = document.createElement("textarea");
    composer.className = "rcc-user-quick-composer";
    composer.rows = 3;
    composer.maxLength = 5000;
    composer.placeholder = "Escribe un mensaje privado a este usuario…";
    composer.setAttribute("aria-label", "Mensaje privado para " + (user.name || user.email || "usuario"));
    const messagingActions = document.createElement("div");
    messagingActions.className = "rcc-user-quick-actions";
    const send = quickActionButton("Enviar mensaje", "small-btn primary", async () => {
      const content = composer.value.trim();
      if (!content) { composer.focus(); return; }
      send.disabled = true;
      send.textContent = "Enviando…";
      try {
        const result = await ensureAdminConversation(user.user_id);
        await adminChatRequest({ action: "send", conversationId: result.conversation.id, content });
        composer.value = "";
        setStatus("Mensaje enviado a " + (user.name || user.email || user.user_id) + ".");
        window.dispatchEvent(new CustomEvent("rcc:admin-chat-updated", { detail: { userId: user.user_id } }));
        closeUserQuickMenu();
      } catch (error) { setStatus(error.message, true); }
      finally { send.disabled = false; send.textContent = "Enviar mensaje"; }
    });
    const openChat = quickActionButton("Abrir conversación", "small-btn", () => {
      window.dispatchEvent(new CustomEvent("rcc:admin-open-user-chat", { detail: { userId: user.user_id } }));
      closeUserQuickMenu();
    });
    messagingActions.append(send, openChat);
    messaging.append(messagingTitle, composer, messagingActions);
    card.append(messaging);

    const moderation = document.createElement("div");
    moderation.className = "rcc-user-quick-section";
    const moderationTitle = document.createElement("strong");
    moderationTitle.textContent = "Control del chat";
    const moderationActions = document.createElement("div");
    moderationActions.className = "rcc-user-quick-actions";
    const toggleChat = quickActionButton("Habilitar / deshabilitar chat", "small-btn", async () => {
      toggleChat.disabled = true;
      try {
        const result = await ensureAdminConversation(user.user_id);
        const enabled = result.conversation.enabled !== true;
        await adminChatRequest({ action: "setEnabled", conversationId: result.conversation.id, enabled });
        toggleChat.textContent = enabled ? "Chat habilitado ✓" : "Chat deshabilitado ✓";
        setStatus(enabled ? "Chat habilitado para este usuario." : "Chat deshabilitado para este usuario.");
        window.dispatchEvent(new CustomEvent("rcc:admin-chat-updated", { detail: { userId: user.user_id } }));
      } catch (error) { setStatus(error.message, true); }
      finally { toggleChat.disabled = false; }
    });
    moderationActions.append(toggleChat);
    moderation.append(moderationTitle, moderationActions);
    card.append(moderation);

    const utility = document.createElement("div");
    utility.className = "rcc-user-quick-section rcc-user-quick-actions";
    utility.append(
      quickActionButton("Copiar correo", "small-btn", async () => {
        try { await navigator.clipboard.writeText(user.email || ""); setStatus("Correo copiado."); }
        catch (_) { setStatus("No se pudo copiar el correo.", true); }
      }),
      quickActionButton("Copiar ID", "small-btn", async () => {
        try { await navigator.clipboard.writeText(user.user_id); setStatus("ID copiado."); }
        catch (_) { setStatus("No se pudo copiar el ID.", true); }
      })
    );
    card.append(utility);

    const identity = document.createElement("div");
    identity.className = "rcc-user-quick-section";
    const identityText = document.createElement("p");
    identityText.className = "rcc-user-quick-hint";
    identityText.textContent = "User ID: " + user.user_id + (user.created_at ? " · Registrado: " + new Date(user.created_at).toLocaleString() : "");
    identity.append(identityText); card.append(identity);
    userQuickMenu.hidden = false;
    close.focus();
  }

  function bindUserLongPress(row, user) {
    row.classList.add("user-quick-hold");
    const cancel = () => {
      if (userHoldTimer) clearTimeout(userHoldTimer);
      userHoldTimer = null;
    };
    row.addEventListener("pointerdown", event => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      userHoldTriggered = false;
      cancel();
      userHoldTimer = setTimeout(() => {
        userHoldTriggered = true;
        openUserQuickMenu(user);
      }, 550);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(name => row.addEventListener(name, cancel));
    row.addEventListener("contextmenu", event => {
      event.preventDefault();
      cancel();
      openUserQuickMenu(user);
    });
  }

  function renderUsers() {
    const body = $("usersBody");
    body.replaceChildren();
    const query = filterText();
    const filter=$("userFilter")?.value||"all", sort=$("userSort")?.value||"newest";
    let rows=dashboard.users.filter(user=>{const q=!query||searchableUser(user).includes(query);const f=filter==="discord"?!!user.discord_id:filter==="no-discord"?!user.discord_id:filter==="banned"?user.is_banned===true:true;return q&&f;});
    rows=[...rows].sort((x,y)=>sort==="oldest"?new Date(x.created_at)-new Date(y.created_at):sort==="discord"?Number(!!y.discord_id)-Number(!!x.discord_id):sort==="email"?String(x.email).localeCompare(String(y.email)):new Date(y.created_at)-new Date(x.created_at));
    $("userCount").textContent = rows.length + " / " + dashboard.users.length;
    if (!rows.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.className = "empty-state";
      cell.textContent = dashboard.users.length ? "No hay usuarios que coincidan con la búsqueda." : "No hay usuarios registrados.";
      row.append(cell); body.append(row); return;
    }
    const fragment = document.createDocumentFragment();
    for (const user of rows) {
      const tr = document.createElement("tr");
      const userCell = document.createElement("td");
      userCell.append(makeUserCell(user));
      const ids = document.createElement("td");
      const uid = document.createElement("small");
      uid.textContent = "User: " + user.user_id;
      uid.style.display = "block";
      uid.style.color = "var(--muted)";
      const did = document.createElement("small");
      did.textContent = "Discord: " + (user.discord_id || "No vinculado");
      did.style.display = "block";
      did.style.color = "var(--muted)";
      ids.append(uid, did);
      const flags = document.createElement("td");
      const group = document.createElement("div");
      group.className = "switches";
      group.append(
        renderSwitch(user, "is_creator", "Creator", !dashboard.capabilities.isCreator),
        renderSwitch(user, "has_banner", "Banner", !dashboard.capabilities.hasBanner)
      );
      flags.append(group);
      tr.append(userCell, ids, flags);
      bindUserLongPress(tr, user);
      fragment.append(tr);
    }
    body.append(fragment);
  }

  function renderDiscord() {
    const body = $("discordBody");
    body.replaceChildren();
    const query = filterText();
    const rows = dashboard.users.filter(user => user.discord_id && (!query || searchableUser(user).includes(query)));
    $("discordCount").textContent = rows.length;
    if (!rows.length) {
      const tr = document.createElement("tr"); const td = document.createElement("td");
      td.colSpan = 3; td.className = "empty-state"; td.textContent = "No hay cuentas Discord vinculadas que coincidan.";
      tr.append(td); body.append(tr); return;
    }
    for (const user of rows) {
      const tr = document.createElement("tr");
      const userTd = document.createElement("td"); userTd.append(makeUserCell(user));
      const discordTd = document.createElement("td"); discordTd.textContent = user.discord_id;
      const actions = document.createElement("td");
      const unlink = document.createElement("button"); unlink.className = "small-btn danger"; unlink.textContent = "Desvincular";
      unlink.style.marginLeft = "6px"; unlink.addEventListener("click", () => unlinkDiscord(user, unlink));
      actions.append(unlink); tr.append(userTd, discordTd, actions); body.append(tr);
    }
  }

  function renderStats() {
    $("statUsers").textContent = Number(dashboard.stats.totalUsers || 0).toLocaleString();
    $("statDiscord").textContent = Number(dashboard.stats.linkedDiscord || 0).toLocaleString();
    $("lastUpdated").textContent = "Última actualización: " + new Date().toLocaleTimeString();
  }

  function render() {
    renderUsers(); renderDiscord(); renderStats();
  }

  async function loadDashboard(silent = false) {
    if (refreshing) return;
    refreshing = true;
    const button = $("refreshAdmin");
    if (!silent) {
      button.classList.add("loading"); button.disabled = true;
      setStatus("Actualizando datos de RCC…");
    }
    try {
      const fresh = await api();
      dashboard = fresh;
      render();
      if (!silent) setStatus("Datos actualizados correctamente.");
      else setStatus("");
    } catch (error) {
      if (!silent) setStatus(error.message, true);
      else console.warn("[RCC Admin] Auto-actualización fallida:", error.message);
    } finally {
      refreshing = false;
      if (!silent) { button.classList.remove("loading"); button.disabled = false; }
    }
  }

  async function postAction(body) {
    return api("", { method: "POST", body: JSON.stringify(body) });
  }

  async function unlinkDiscord(user, button) {
    if (!window.confirm("¿Eliminar el discord_id guardado en el perfil RCC de " + user.email + "? Esto no elimina su identidad OAuth de Supabase.")) return;
    button.disabled = true;
    try {
      await postAction({ action: "unlinkDiscord", userId: user.user_id });
      setStatus("Discord desvinculado del perfil RCC. La identidad OAuth de Supabase no se eliminó.");
      await loadDashboard(true);
    } catch (error) { setStatus(error.message, true); }
    finally { button.disabled = false; }
  }

  function selectTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".admin-tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    document.querySelectorAll(".admin-panel").forEach(panel => panel.classList.toggle("active", panel.id === "panel-" + tab));
  }


  function renderMinerStatus(label, message, tone = "muted") {
    const box = $("rccMinerStatus");
    if (!box) return;
    box.replaceChildren();
    const badge = document.createElement("span");
    badge.className = "pill " + tone;
    badge.textContent = label;
    const detail = document.createElement("span");
    detail.className = "hint";
    detail.textContent = message;
    box.append(badge, detail);
  }

  async function triggerBulkImport() {
    const button = $("rccRunBulkImport");
    if (!button || button.disabled) return;
    if (!session?.access_token) {
      renderMinerStatus("Error", "La sesión de administrador expiró. Vuelve a iniciar sesión.", "warn");
      return;
    }
    button.disabled = true;
    button.textContent = "⛏ Minando…";
    const requestedAt = new Date().toISOString();
    renderMinerStatus("Minando…", "Enviando la orden a GitHub Actions.", "warn");
    try {
      const response = await fetch("/api/trigger-import", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.access_token },
        credentials: "same-origin",
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo iniciar la importación.");
      renderMinerStatus("Minando…", "GitHub recibió la orden. Esperando que arranque el workflow…", "warn");

      let completed = false;
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 7000));
        const statusResponse = await fetch("/api/trigger-import?since=" + encodeURIComponent(requestedAt), {
          headers: { Authorization: "Bearer " + session.access_token },
          credentials: "same-origin",
          cache: "no-store"
        });
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(status.error || "No se pudo consultar el estado de GitHub Actions.");
        if (!status.found) {
          renderMinerStatus("Minando…", status.message || "GitHub está registrando la ejecución.", "warn");
          continue;
        }
        if (status.status !== "completed") {
          renderMinerStatus("Minando…", "Ejecución #" + (status.run_number || status.id) + " · " + status.status + ". " + (status.html_url ? "Abre GitHub Actions para ver los registros." : ""), "warn");
          continue;
        }
        completed = true;
        if (status.conclusion === "success") {
          renderMinerStatus("Completado", "La importación terminó correctamente. Ejecución #" + (status.run_number || status.id) + ".", "ok");
        } else {
          renderMinerStatus("Falló", "GitHub terminó la ejecución con estado: " + (status.conclusion || "desconocido") + ".", "warn");
        }
        if (status.html_url) {
          const link = document.createElement("a");
          link.href = status.html_url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = "Ver ejecución en GitHub";
          link.style.color = "var(--cyan)";
          link.style.marginLeft = "auto";
          $("rccMinerStatus").append(link);
        }
        break;
      }
      if (!completed) renderMinerStatus("En curso", "La importación sigue ejecutándose o tardó más de 10 minutos. Puedes volver a consultar GitHub Actions.", "warn");
    } catch (error) {
      renderMinerStatus("Error", error.message || "No se pudo ejecutar la importación.", "warn");
    } finally {
      button.disabled = false;
      button.textContent = "⛏ Ejecutar Importación Masiva";
    }
  }

  async function start() {
    try {
      const ready = window.rccAdminSupabaseReady;
      if (!ready) throw new Error("Supabase no está configurado.");
      supabaseClient = await ready;
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      session = data.session;
      if (!session?.access_token || session.user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
        window.location.replace("/index.html");
        return;
      }
      $("adminIdentity").textContent = session.user.email;
      boot.hidden = true; shell.hidden = false;
      await loadDashboard(false);
      supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
        if (!nextSession?.access_token || nextSession.user?.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
          window.location.replace("/index.html");
          return;
        }
        session = nextSession;
      });
      refreshTimer = window.setInterval(() => { void loadDashboard(true); }, 30000);
    } catch (error) {
      showBoot("No se pudo iniciar el panel: " + error.message);
      setTimeout(() => window.location.replace("/index.html"), 2500);
    }
  }

  $("refreshAdmin").addEventListener("click", () => { void loadDashboard(false); });
  $("rccRunBulkImport")?.addEventListener("click", () => { void triggerBulkImport(); });
  $("globalSearch").addEventListener("input", render);
  $("userSort")?.addEventListener("change",render); $("userFilter")?.addEventListener("change",render);
  $("adminLogout").addEventListener("click", async () => {
    if (refreshTimer) clearInterval(refreshTimer);
    await supabaseClient.auth.signOut().catch(() => {});
    window.location.replace("/index.html");
  });
  document.querySelectorAll(".admin-tab").forEach(button => button.addEventListener("click", () => selectTab(button.dataset.tab)));
  window.addEventListener("pagehide", () => { if (refreshTimer) clearInterval(refreshTimer); });
  void start();
})();
