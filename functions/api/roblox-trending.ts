type RobloxGame = { universeId?: number; rootPlaceId?: number; placeId?: number; playerCount?: number; name?: string; creator?: { name?: string }; };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120", "Access-Control-Allow-Origin": "*" } });
const timeout = (ms = 9000) => AbortSignal.timeout(ms);
async function getJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "RCC-Roblox-Trends/1.0" }, signal: timeout() });
  if (!response.ok) throw new Error("Roblox API returned " + response.status);
  return response.json() as Promise<any>;
}
function collectIds(value: any, output: Map<number, RobloxGame>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const item of value) collectIds(item, output); return; }
  const universeId = Number(value.universeId ?? value.universeID);
  if (Number.isSafeInteger(universeId) && universeId > 0) {
    output.set(universeId, { universeId, rootPlaceId: Number(value.rootPlaceId ?? value.placeId) || undefined, playerCount: Number(value.playerCount) || 0, name: typeof value.name === "string" ? value.name : undefined });
  }
  for (const [key, child] of Object.entries(value)) {
    if (["universeId", "universeID"].includes(key)) continue;
    if (child && typeof child === "object") collectIds(child, output);
  }
}
export async function onRequestGet() {
  try {
    const sessionId = crypto.randomUUID();
    const base = "https://apis.roblox.com/explore-api/v1";
    const params = new URLSearchParams({ sessionId, device: "computer", country: "all" });
    // Discover the current chart identifiers instead of assuming Roblox keeps static sort IDs.
    const sortData = await getJson(base + "/get-sorts?" + params.toString());
    const availableSorts = Array.isArray(sortData.sorts) ? sortData.sorts : [];
    const wanted = availableSorts.filter((sort: any) => {
      const id = String(sort.sortId || sort.token || "").toLowerCase();
      const name = String(sort.sortDisplayName || sort.name || "").toLowerCase();
      return /top-playing-now|top-trending/.test(id) || /playing now|trending|más jugados|tendencias/.test(name);
    });
    const selected = wanted.length ? wanted : [{ sortId: "top-playing-now" }, { sortId: "top-trending" }];
    const results = await Promise.allSettled(selected.slice(0, 4).map((sort: any) => {
      const url = new URL(base + "/get-sort-content");
      for (const [key, value] of params) url.searchParams.set(key, value);
      url.searchParams.set("sortId", String(sort.sortId || sort.token));
      url.searchParams.set("maxRows", "100");
      return getJson(url.toString());
    }));
    const candidates = new Map<number, RobloxGame>();
    for (const result of results) if (result.status === "fulfilled") collectIds(result.value, candidates);
    if (!candidates.size) return json({ items: [], source: "Roblox Discover API", updatedAt: new Date().toISOString(), unavailable: true, error: "Roblox no devolvió juegos para sus gráficos públicos." }, 503);
    const ids = [...candidates.keys()].slice(0, 100);
    const groups = await Promise.all(Array.from({ length: Math.ceil(ids.length / 50) }, (_, index) => {
      const detailUrl = new URL("https://games.roblox.com/v1/games");
      detailUrl.searchParams.set("universeIds", ids.slice(index * 50, index * 50 + 50).join(","));
      return getJson(detailUrl.toString());
    }));
    const games: any[] = groups.flatMap(group => Array.isArray(group.data) ? group.data : []);
    const iconGroups = await Promise.all(Array.from({ length: Math.ceil(games.length / 100) }, (_, index) => {
      const iconUrl = new URL("https://thumbnails.roblox.com/v1/games/icons");
      iconUrl.searchParams.set("universeIds", games.slice(index * 100, index * 100 + 100).map(game => game.id).filter(Boolean).join(","));
      iconUrl.searchParams.set("size", "512x512"); iconUrl.searchParams.set("format", "Png"); iconUrl.searchParams.set("isCircular", "false");
      return getJson(iconUrl.toString());
    }));
    const images = new Map<number, string>();
    for (const icons of iconGroups) for (const item of Array.isArray(icons.data) ? icons.data : []) {
      if (Number.isSafeInteger(item.targetId) && typeof item.imageUrl === "string" && item.imageUrl.startsWith("https://")) images.set(item.targetId, item.imageUrl);
    }
    const items = games.filter(game => Number.isSafeInteger(game.id) && game.id > 0).map(game => ({
      universeId: game.id, placeId: game.rootPlaceId, name: String(game.name || "Experiencia de Roblox"),
      creator: String(game.creator?.name || "Creador de Roblox"), playing: Number.isFinite(game.playing) ? game.playing : 0,
      visits: Number.isFinite(game.visits) ? game.visits : 0, image: images.get(game.id) || null,
      url: Number.isSafeInteger(game.rootPlaceId) ? "https://www.roblox.com/games/" + game.rootPlaceId : null
    })).sort((a, b) => b.playing - a.playing || b.visits - a.visits).slice(0, 50);
    if (!items.length) return json({ items: [], source: "Roblox public APIs", updatedAt: new Date().toISOString(), unavailable: true }, 503);
    return json({ items, source: "Roblox Discover + Games + Thumbnails APIs", updatedAt: new Date().toISOString(), sort: "playing_desc_visits_desc" });
  } catch {
    return json({ items: [], source: "Roblox public APIs", updatedAt: new Date().toISOString(), unavailable: true, error: "Roblox no está entregando las tendencias en este momento." }, 503);
  }
}
