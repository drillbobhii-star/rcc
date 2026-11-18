/* Live Roblox Discover charts. Never invent player or visit counts. */
(() => {
  const tab = document.getElementById("trendingTab");
  const grid = document.getElementById("scripts");
  if (!tab || !grid) return;
  const panel = document.createElement("section");
  panel.id = "rccRobloxTrends";
  panel.className = "rcc-roblox-trends";
  panel.hidden = true;
  panel.setAttribute("aria-labelledby", "rccRobloxTrendsTitle");
  panel.innerHTML = '<div class="rcc-trends-heading"><div><span class="eyebrow">ROBLOX DISCOVER · DATOS PÚBLICOS</span><h2 id="rccRobloxTrendsTitle">Juegos más populares</h2><p>Ordenados por jugadores conectados ahora; las visitas totales sirven como segundo criterio.</p></div><button type="button" class="btn btn-ghost" data-refresh>Actualizar</button></div><p class="rcc-trends-status" role="status" aria-live="polite">Cargando datos públicos de Roblox…</p><div class="rcc-trends-grid"></div><small class="rcc-trends-source">Fuente: Roblox Discover, Games y Thumbnails APIs. Las cifras son lecturas públicas y pueden cambiar.</small>';
  document.getElementById("activeFilters")?.before(panel);
  const status = panel.querySelector(".rcc-trends-status");
  const cards = panel.querySelector(".rcc-trends-grid");
  const refresh = panel.querySelector("[data-refresh]");
  const format = new Intl.NumberFormat("es");
  let request = null, lastItems = [], updatedAt = null;
  const hiddenTargets = ["catalogNews", "codeCompare", "activeFilters", "scripts", "loadMore", "resultCount"];
  const savedDisplay = new Map();
  function showTrends(on) {
    panel.hidden = !on;
    for (const id of hiddenTargets) {
      const node = document.getElementById(id);
      if (!node) continue;
      if (on) { if (!savedDisplay.has(id)) savedDisplay.set(id, node.hidden); node.hidden = true; }
      else if (savedDisplay.has(id)) { node.hidden = savedDisplay.get(id); savedDisplay.delete(id); }
    }
    document.querySelector(".catalog-tools")?.toggleAttribute("hidden", on);
    document.querySelector(".compat-note")?.toggleAttribute("hidden", on);
    document.querySelector(".rcc-safety-notices")?.toggleAttribute("hidden", on);
  }
  function render(items) {
    cards.replaceChildren();
    for (const [index, game] of items.entries()) {
      const card = document.createElement("button");
      card.type = "button"; card.className = "rcc-trend-game";
      card.setAttribute("aria-label", "Ver scripts de " + game.name);
      const cover = document.createElement("span"); cover.className = "rcc-trend-cover";
      if (game.image) { const image = document.createElement("img"); image.src = game.image; image.alt = ""; image.loading = "lazy"; image.decoding = "async"; cover.append(image); }
      else { cover.textContent = "ROBLOX"; cover.classList.add("is-fallback"); }
      const rank = document.createElement("span"); rank.className = "rcc-trend-rank"; rank.textContent = "#" + (index + 1);
      cover.append(rank);
      const info = document.createElement("span"); info.className = "rcc-trend-info";
      const name = document.createElement("strong"); name.textContent = game.name;
      const creator = document.createElement("small"); creator.textContent = game.creator ? "Por " + game.creator : "Experiencia de Roblox";
      const players = document.createElement("span"); players.className = "rcc-trend-metric"; players.textContent = format.format(game.playing) + " jugando ahora";
      const visits = document.createElement("small"); visits.textContent = format.format(game.visits) + " visitas totales";
      info.append(name, creator, players, visits); card.append(cover, info);
      card.addEventListener("click", () => openGameScripts(game.name));
      cards.append(card);
    }
  }
  function openGameScripts(name) {
    const filter = document.getElementById("gameFilter");
    if (!filter || typeof window.RCCNavigation?.section !== "function") return;
    const option = [...filter.options].find(item => item.value === name || item.textContent.trim() === name);
    if (!option) {
      status.textContent = "RCC todavía no tiene scripts registrados para " + name + ".";
      return;
    }
    showTrends(false); tab.setAttribute("aria-pressed", "false");
    window.RCCNavigation.section("games");
    filter.value = option.value;
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("catalogHeading")?.scrollIntoView({ behavior: "instant", block: "start" });
  }
  async function load(force = false) {
    if (request) return request;
    refresh.disabled = true; status.textContent = "Consultando las listas públicas de Roblox…";
    request = (async () => {
      try {
        const response = await fetch("/api/roblox-trending", { cache: force ? "reload" : "default", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        if (!response.ok || data.unavailable || !Array.isArray(data.items)) throw new Error(data.error || "Roblox no está entregando las tendencias.");
        lastItems = data.items.filter(item => typeof item.name === "string" && Number.isFinite(item.playing) && Number.isFinite(item.visits)).sort((a,b) => b.playing-a.playing || b.visits-a.visits);
        updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        render(lastItems);
        status.textContent = lastItems.length ? "Actualizado " + updatedAt.toLocaleTimeString("es") + " · " + lastItems.length + " juegos" : "Roblox no devolvió juegos para esta lista.";
      } catch (error) {
        status.textContent = lastItems.length ? "No se pudo actualizar. Se conserva la última consulta: " + (updatedAt?.toLocaleTimeString("es") || "sin hora") : "No se pudieron cargar los datos oficiales de Roblox. Comprueba tu conexión y reintenta.";
        if (!lastItems.length) {
          cards.replaceChildren();
          const retry = document.createElement("button"); retry.type = "button"; retry.className = "btn btn-ghost"; retry.textContent = "Reintentar"; retry.onclick = () => load(true); cards.append(retry);
        }
      } finally { request = null; refresh.disabled = false; }
    })();
    return request;
  }
  tab.textContent = "Tendencias";
  tab.onclick = () => {
    window.RCCNavigation?.section("all");
    showTrends(true);
    tab.setAttribute("aria-pressed", "true");
    for (const id of ["libraryTab","gamesTab","webTab","javaTab","fivemTab"]) document.getElementById(id)?.setAttribute("aria-pressed","false");
    document.getElementById("heroTitle").textContent = "Tendencias de Roblox";
    document.getElementById("heroSubtitle").textContent = "Los juegos más jugados ahora mismo, con datos públicos de Roblox.";
    load();
  };
  for (const id of ["libraryTab","gamesTab","studioTab","studioNav","webTab","javaTab","fivemTab","favoritesBtn","recentBtn","gamesNav","webNav","javaNav","fivemNav"]) {
    document.getElementById(id)?.addEventListener("click", () => { showTrends(false); tab.setAttribute("aria-pressed","false"); });
  }
  refresh.addEventListener("click", () => load(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !panel.hidden) load(); });
  window.addEventListener("online", () => { if (!panel.hidden) load(true); });
})();