(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const escUrl = (value) => {
    try { const url = new URL(String(value || ""), location.origin); return url.protocol === "https:" || url.origin === location.origin ? url.href : ""; }
    catch { return ""; }
  };
  const style = document.createElement("style");
  style.textContent = `
    #rccProfileSearchOpen{border:1px solid var(--border-glass);background:rgba(255,255,255,.07);color:var(--text);border-radius:12px;padding:10px 14px;font-weight:750;cursor:pointer}
    #rccProfileSearchDialog{width:min(760px,calc(100% - 24px));max-height:min(86dvh,820px);padding:0;border:1px solid #ffffff28;border-radius:22px;background:#0d1320;color:#f4f6ff;overflow:hidden;box-shadow:0 28px 90px #000b}
    #rccProfileSearchDialog::backdrop{background:#02040bdc;backdrop-filter:blur(12px)}
    .rcc-ps-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 20px;border-bottom:1px solid #ffffff18}
    .rcc-ps-head h2{font-size:1.15rem;margin:0}.rcc-ps-close,.rcc-ps-back{border:1px solid #ffffff24;background:#1b2638;color:#fff;border-radius:10px;padding:9px 12px;cursor:pointer}
    .rcc-ps-search{display:flex;gap:9px;padding:16px 20px}.rcc-ps-search input{flex:1;min-width:0;padding:13px 14px;border:1px solid #ffffff25;border-radius:12px;background:#080e19;color:#fff;font:inherit}
    .rcc-ps-search button{border:0;border-radius:12px;padding:12px 16px;background:linear-gradient(120deg,#7162db,#287f9d);color:#fff;font-weight:800;cursor:pointer}
    #rccProfileSearchStatus{padding:0 20px 12px;color:#aab4c8;min-height:22px}
    #rccProfileSearchResults{padding:0 20px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;max-height:58dvh;overflow:auto}
    .rcc-ps-user{display:flex;align-items:center;gap:12px;text-align:left;min-width:0;padding:12px;border:1px solid #ffffff18;border-radius:14px;background:#151e2d;color:#fff;cursor:pointer}
    .rcc-ps-user:hover{border-color:#9d91ff88;transform:translateY(-1px)}
    .rcc-ps-avatar{width:48px;height:48px;flex:none;border-radius:50%;object-fit:cover;background:#28344a}
    .rcc-ps-user strong,.rcc-ps-user small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rcc-ps-user small{color:#9eabc2;margin-top:4px}
    .rcc-ps-detail{grid-column:1/-1;border:1px solid #ffffff20;border-radius:16px;overflow:hidden;background:#111a29}
    .rcc-ps-cover{height:150px;background:linear-gradient(120deg,#243b5d,#46345f) center/cover no-repeat}
    .rcc-ps-detail-body{padding:0 18px 18px}.rcc-ps-detail-avatar{width:82px;height:82px;margin-top:-38px;border:4px solid #111a29;border-radius:50%;object-fit:cover;background:#26344b}
    .rcc-ps-detail h3{margin:10px 0 4px}.rcc-ps-detail p{white-space:pre-wrap;overflow-wrap:anywhere;color:#c1cada}.rcc-ps-roblox{display:inline-block;margin-top:10px;color:#a9c8ff}
    @media(max-width:560px){.rcc-ps-search{padding:12px;flex-wrap:wrap}.rcc-ps-search input{flex-basis:100%}#rccProfileSearchResults{padding:0 12px 14px}.rcc-ps-head{padding:14px}}
  `;
  document.head.append(style);
  const nav = $(".section-tabs") || $(".auth-controls");
  if (!nav || $("#rccProfileSearchOpen")) return;
  const open = document.createElement("button");
  open.id = "rccProfileSearchOpen"; open.type = "button"; open.textContent = "🔎 Buscar perfiles";
  nav.append(open);
  const dialog = document.createElement("dialog");
  dialog.id = "rccProfileSearchDialog";
  dialog.setAttribute("aria-label", "Buscar perfiles de RCC");
  dialog.innerHTML = `
    <div class="rcc-ps-head"><h2>👥 Buscar perfiles RCC</h2><button type="button" class="rcc-ps-close">Cerrar ✕</button></div>
    <form class="rcc-ps-search"><input type="search" maxlength="80" autocomplete="off" placeholder="Nombre o usuario de Roblox…" aria-label="Nombre o usuario"><button type="submit">Buscar</button></form>
    <p id="rccProfileSearchStatus" role="status" aria-live="polite">Escribe al menos 2 caracteres para buscar.</p>
    <div id="rccProfileSearchResults"></div>`;
  document.body.append(dialog);
  const form = $(".rcc-ps-search", dialog), input = $("input", form), results = $("#rccProfileSearchResults", dialog), status = $("#rccProfileSearchStatus", dialog);
  let clientPromise = null, requestId = 0, lastRows = [];
  const say = (message) => { status.textContent = message; };
  const makeImage = (src, cls, alt) => { const img = document.createElement("img"); img.className = cls; img.alt = alt || ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer"; img.src = escUrl(src) || "/assets/default-avatar.svg"; img.onerror = () => { img.src = "/assets/default-avatar.svg"; }; return img; };
  function showProfile(profile) {
    results.replaceChildren();
    const detail = document.createElement("article"); detail.className = "rcc-ps-detail";
    const cover = document.createElement("div"); cover.className = "rcc-ps-cover";
    const coverUrl = escUrl(profile.banner_url); if (coverUrl) cover.style.backgroundImage = 'url("' + coverUrl.replace(/["\\\\]/g, "") + '")';
    const body = document.createElement("div"); body.className = "rcc-ps-detail-body";
    const back = document.createElement("button"); back.type = "button"; back.className = "rcc-ps-back"; back.textContent = "← Volver a resultados"; back.addEventListener("click", () => renderRows(lastRows));
    const avatar = makeImage(profile.avatar_url, "rcc-ps-detail-avatar", "Foto de perfil");
    const name = document.createElement("h3"); name.textContent = profile.display_name || "Miembro RCC";
    const bio = document.createElement("p"); bio.textContent = profile.bio || "Este usuario todavía no ha añadido una biografía.";
    body.append(back, document.createElement("br"), avatar, name, bio);
    if (profile.show_roblox && /^\\d+$/.test(String(profile.roblox_id || ""))) {
      const link = document.createElement("a"); link.className = "rcc-ps-roblox"; link.href = "https://www.roblox.com/users/" + profile.roblox_id + "/profile"; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "Ver perfil de Roblox ↗"; body.append(link);
    } else if (profile.roblox_username) {
      const roblox = document.createElement("p"); roblox.textContent = "Roblox: @" + profile.roblox_username; body.append(roblox);
    }
    detail.append(cover, body); results.append(detail); say("Perfil público de RCC. No mostramos correos ni datos privados.");
  }
  function renderRows(rows) {
    lastRows = rows; results.replaceChildren();
    if (!rows.length) { say("No encontramos perfiles con ese nombre."); return; }
    say(rows.length + " perfil(es) encontrado(s).");
    rows.forEach(profile => {
      const button = document.createElement("button"); button.type = "button"; button.className = "rcc-ps-user";
      button.append(makeImage(profile.avatar_url, "rcc-ps-avatar", ""));
      const copy = document.createElement("span"), name = document.createElement("strong"), handle = document.createElement("small");
      name.textContent = profile.display_name || "Miembro RCC"; handle.textContent = profile.roblox_username ? "@" + profile.roblox_username : "Perfil RCC";
      copy.append(name, handle); button.append(copy); button.addEventListener("click", () => showProfile(profile)); results.append(button);
    });
  }
  async function searchProfiles(term) {
    const id = ++requestId; results.replaceChildren(); say("Buscando perfiles…");
    try {
      clientPromise ||= window.rccSupabaseReady;
      const sb = await clientPromise;
      if (!sb) throw new Error("El servicio de perfiles no está disponible.");
      const fields = "user_id,display_name,avatar_url,banner_url,bio,roblox_username,roblox_id,show_roblox";
      const pattern = "%" + term.replace(/[%,()]/g, " ").trim() + "%";
      const [byName, byRoblox] = await Promise.all([
        sb.from("profiles").select(fields).ilike("display_name", pattern).limit(25),
        sb.from("profiles").select(fields).ilike("roblox_username", pattern).limit(25)
      ]);
      if (id !== requestId) return;
      const error = byName.error || byRoblox.error;
      if (error) throw error;
      const unique = new Map();
      [...(byName.data || []), ...(byRoblox.data || [])].forEach(row => { if (row.user_id) unique.set(row.user_id, row); });
      renderRows([...unique.values()].slice(0, 40));
    } catch (error) {
      if (id !== requestId) return;
      say(error?.message || "No se pudo buscar. Inténtalo de nuevo.");
    }
  }
  form.addEventListener("submit", event => { event.preventDefault(); const term = input.value.trim(); if (term.length < 2) { say("Escribe al menos 2 caracteres."); return; } void searchProfiles(term); });
  $(".rcc-ps-close", dialog).addEventListener("click", () => dialog.close());
  open.addEventListener("click", () => { input.value = ""; results.replaceChildren(); say("Escribe al menos 2 caracteres para buscar."); if (!dialog.open) dialog.showModal(); input.focus(); });
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
})();
