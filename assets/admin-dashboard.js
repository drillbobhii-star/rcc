(() => {
  "use strict";

  const ADMIN_EMAIL = "drillbobhii@gmail.com";
  const $ = (id) => document.getElementById(id);
  const boot = $("adminBoot");
  const shell = $("rccAdminShell");
  const statusEl = $("adminStatus");
  let supabaseClient = null;
  let session = null;
  let dashboard = { users: [], payments: [], stats: {}, capabilities: {} };
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

  function renderUsers() {
    const body = $("usersBody");
    body.replaceChildren();
    const query = filterText();
    const rows = dashboard.users.filter(user => !query || searchableUser(user).includes(query));
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
        renderSwitch(user, "is_vip", "VIP"),
        renderSwitch(user, "is_creator", "Creator", !dashboard.capabilities.isCreator),
        renderSwitch(user, "has_banner", "Banner", !dashboard.capabilities.hasBanner)
      );
      flags.append(group);
      tr.append(userCell, ids, flags);
      fragment.append(tr);
    }
    body.append(fragment);
  }

  function roleStatusLabel(result) {
    const status = result?.roleStatus?.status || result?.roleStatus;
    if (status === "ROLE_GRANTED") return "VIP guardado y rol entregado en Discord.";
    if (status === "NOT_IN_GUILD") return "VIP activado. El usuario todavía no está en el servidor de Discord.";
    if (status === "VIP_ROLE_NOT_FOUND") return "VIP activado en la web, pero no existe DISCORD_VIP_ROLE_ID en el servidor.";
    if (status === "DISCORD_NOT_LINKED") return "VIP activado en la web. El usuario todavía no ha vinculado Discord.";
    if (status === "NOT_CONFIGURED") return "VIP activado en la web. La conexión Railway no está configurada.";
    return "VIP aprobado. Estado de rol: " + safeText(status || "desconocido");
  }

  function renderPayments() {
    const body = $("paymentsBody");
    body.replaceChildren();
    const query = filterText();
    const rows = dashboard.payments.filter(item => {
      const linked = dashboard.users.find(user => user.user_id === item.matched_user_id);
      return !query || [item.buyer_email, item.message_id, item.kofi_transaction_id, item.user_id, item.matched_discord_id, linked?.user_id].join(" ").toLowerCase().includes(query);
    });
    $("paymentCount").textContent = rows.length + " / " + dashboard.payments.length;
    if (!rows.length) {
      const tr = document.createElement("tr"); const td = document.createElement("td");
      td.colSpan = 5; td.className = "empty-state"; td.textContent = "No hay pagos que coincidan con la búsqueda.";
      tr.append(td); body.append(tr); return;
    }
    const frag = document.createDocumentFragment();
    for (const payment of rows) {
      const tr = document.createElement("tr");
      const buyer = document.createElement("td"); buyer.textContent = payment.buyer_email || "Correo no disponible";
      const amount = document.createElement("td");
      const amountStrong = document.createElement("strong");
      amountStrong.textContent = (Number(payment.amount) || 0).toFixed(2) + " " + (payment.currency || "USD");
      amount.append(amountStrong);
      const date = document.createElement("td"); date.textContent = payment.created_at ? new Date(payment.created_at).toLocaleString() : "Fecha no registrada";
      const match = document.createElement("td");
      const matchedUser = payment.matched_user_id ? dashboard.users.find(u => u.user_id === payment.matched_user_id) : null;
      const pill = document.createElement("span");
      pill.className = "pill " + (matchedUser ? "ok" : "warn");
      pill.textContent = matchedUser ? "Cuenta RCC encontrada" : "Sin cuenta RCC";
      match.append(pill);
      const action = document.createElement("td");
      if (matchedUser && payment.message_id && Number(payment.amount) >= 1.99 && payment.currency === "USD") {
        const button = document.createElement("button"); button.className = "small-btn"; button.textContent = "Aprobar VIP";
        button.addEventListener("click", () => approvePayment(payment, button));
        action.append(button);
      } else {
        const text = document.createElement("span"); text.className = "hint"; text.textContent = matchedUser ? "No cumple el mínimo" : "Esperando registro"; action.append(text);
      }
      tr.append(buyer, amount, date, match, action); frag.append(tr);
    }
    body.append(frag);
  }

  function renderDiscord() {
    const body = $("discordBody");
    body.replaceChildren();
    const query = filterText();
    const rows = dashboard.users.filter(user => user.discord_id && (!query || searchableUser(user).includes(query)));
    $("discordCount").textContent = rows.length;
    if (!rows.length) {
      const tr = document.createElement("tr"); const td = document.createElement("td");
      td.colSpan = 4; td.className = "empty-state"; td.textContent = "No hay cuentas Discord vinculadas que coincidan.";
      tr.append(td); body.append(tr); return;
    }
    for (const user of rows) {
      const tr = document.createElement("tr");
      const userTd = document.createElement("td"); userTd.append(makeUserCell(user));
      const discordTd = document.createElement("td"); discordTd.textContent = user.discord_id;
      const vipTd = document.createElement("td");
      const vip = document.createElement("span"); vip.className = "pill " + (user.is_vip ? "ok" : "muted"); vip.textContent = user.is_vip ? "VIP" : "No VIP"; vipTd.append(vip);
      const actions = document.createElement("td");
      const grant = document.createElement("button"); grant.className = "small-btn"; grant.textContent = "Forzar rol";
      grant.addEventListener("click", () => forceRole(user, grant));
      const unlink = document.createElement("button"); unlink.className = "small-btn danger"; unlink.textContent = "Desvincular";
      unlink.style.marginLeft = "6px"; unlink.addEventListener("click", () => unlinkDiscord(user, unlink));
      actions.append(grant, unlink); tr.append(userTd, discordTd, vipTd, actions); body.append(tr);
    }
  }

  function renderStats() {
    $("statUsers").textContent = Number(dashboard.stats.totalUsers || 0).toLocaleString();
    $("statVips").textContent = Number(dashboard.stats.activeVips || 0).toLocaleString();
    $("statDiscord").textContent = Number(dashboard.stats.linkedDiscord || 0).toLocaleString();
    $("statRevenue").textContent = "$" + Number(dashboard.stats.usdRevenueShown || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $("lastUpdated").textContent = "Última actualización: " + new Date().toLocaleTimeString();
  }

  function render() {
    renderUsers(); renderPayments(); renderDiscord(); renderStats();
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

  async function approvePayment(payment, button) {
    if (!window.confirm("¿Aprobar el VIP para " + payment.buyer_email + "? Se activará en la web y se intentará asignar el rol Discord.")) return;
    button.disabled = true; button.textContent = "Procesando…";
    try {
      const result = await postAction({ action: "approvePayment", messageId: payment.message_id });
      setStatus(roleStatusLabel(result));
      await loadDashboard(true);
    } catch (error) {
      setStatus(error.message, true);
    } finally {
      button.disabled = false; button.textContent = "Aprobar VIP";
    }
  }

  async function forceRole(user, button) {
    if (!window.confirm("¿Forzar la asignación del rol VIP a " + user.email + "?")) return;
    button.disabled = true; button.textContent = "Enviando…";
    try {
      const result = await postAction({ action: "forceRole", userId: user.user_id });
      const roleStatus = result.roleStatus?.status || result.roleStatus;
      setStatus(roleStatusLabel(result));
      if (roleStatus === "NOT_IN_GUILD" && result.roleStatus?.inviteUrl) setStatus("El usuario no está en el servidor. Invitación: " + result.roleStatus.inviteUrl, true);
      await loadDashboard(true);
    } catch (error) { setStatus(error.message, true); }
    finally { button.disabled = false; button.textContent = "Forzar rol"; }
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
  $("globalSearch").addEventListener("input", render);
  $("adminLogout").addEventListener("click", async () => {
    if (refreshTimer) clearInterval(refreshTimer);
    await supabaseClient.auth.signOut().catch(() => {});
    window.location.replace("/index.html");
  });
  document.querySelectorAll(".admin-tab").forEach(button => button.addEventListener("click", () => selectTab(button.dataset.tab)));
  window.addEventListener("pagehide", () => { if (refreshTimer) clearInterval(refreshTimer); });
  void start();
})();
