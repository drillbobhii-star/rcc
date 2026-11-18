type RobloxGame = { universeId?: number; rootPlaceId?: number; placeId?: number; playerCount?: number; name?: string; creator?: { name?: string }; };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "public, max-age=180, stale-while-revalidate=300", "Access-Control-Allow-Origin": "*" } });
const timeout = (ms = 9000) => AbortSignal.timeout(ms);
async function getJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "RCC-Roblox-Trends/1.0" }, signal: timeout() });
  if (!response.ok) throw new Error("Roblox API returned " + response.status);
  return response.json() as Promise<any>;
}
function collectIds(value: any, output: Map<number, RobloxGame>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const item of value) collectIds(item, output); return; }
  const universeId = Number(value.universeId ?? value.universeID ?? value.id);
  if (Number.isSafeInteger(universeId) && universeId > 0 && (value.rootPlaceId || value.placeId || value.playerCount !== undefined || value.name)) {
    output.set(universeId, { universeId, rootPlaceId: Number(value.rootPlaceId ?? value.placeId) || undefined, playerCount: Number(value.playerCount) || 0, name: typeof value.name === "string" ? value.name : undefined });
  }
  for (const [key, child] of Object.entries(value)) {
    if (["universeId", "universeID", "id", "rootPlaceId", "placeId", "playerCount", "name"].includes(key)) continue;
    if (child && typeof child === "object") collectIds(child, output);
  }
}
export async function onRequestGet() {
  try {
    const sessionId = crypto.randomUUID();
    const base = "https://apis.roblox.com/explore-api/v1/get-sort-content";
    const sorts = ["top-playing-now", "top-trending"];
    const results = await Promise.allSettled(sorts.map(sortId => {
      const url = new URL(base); url.searchParams.set("sessionId", sessionId); url.searchParams.set("sortId", sortId); url.searchParams.set("device", "computer"); url.searchParams.set("country", "all");
      return getJson(url.toString());
    }));
    const candidates = new Map<number, RobloxGame>();
    for (const result of results) if (result.status === "fulfilled") collectIds(result.value, candidates);
    if (!candidates.size) return json({ items: [], source: "Roblox Discover API", updatedAt: new Date().toISOString(), unavailable: true }, 503);
    const ids = [...candidates.keys()].slice(0, 100);
    const detailUrl = new URL("https://games.roblox.com/v1/games");
    detailUrl.searchParams.set("universeIds", ids.join(","));
    const details = await getJson(detailUrl.toString());
    const games: any[] = Array.isArray(details.data) ? details.data : [];
    const iconUrl = new URL("https://thumbnails.roblox.com/v1/games/icons");
    iconUrl.searchParams.set("universeIds", games.map(game => game.id).filter(Boolean).join(","));
    iconUrl.searchParams.set("size", "512x512"); iconUrl.searchParams.set("format", "Png"); iconUrl.searchParams.set("isCircular", "false");
    const icons = await getJson(iconUrl.toString());
    const images = new Map<number, string>();
    for (const item of Array.isArray(icons.data) ? icons.data : []) if (Number.isSafeInteger(item.targetId) && typeof item.imageUrl === "string" && item.imageUrl.startsWith("https://")) images.set(item.targetId, item.imageUrl);
    const items = games.filter(game => Number.isSafeInteger(game.id) && game.id > 0).map(game => ({
      universeId: game.id,
      placeId: game.rootPlaceId,
      name: String(game.name || "Experiencia de Roblox"),
      creator: String(game.creator?.name || "Creador de Roblox"),
      playing: Number.isFinite(game.playing) ? game.playing : 0,
      visits: Number.isFinite(game.visits) ? game.visits : 0,
      image: images.get(game.id) || null,
      url: Number.isSafeInteger(game.rootPlaceId) ? "https://www.roblox.com/games/" + game.rootPlaceId : null
    })).sort((a, b) => b.playing - a.playing || b.visits - a.visits).slice(0, 50);
    return json({ items, source: "Roblox Discover + Games + Thumbnails APIs", updatedAt: new Date().toISOString(), sort: "playing_desc_visits_desc" });
  } catch {
    return json({ items: [], source: "Roblox public APIs", updatedAt: new Date().toISOString(), unavailable: true, error: "Roblox no está entregando las tendencias en este momento." }, 503);
  }
}
