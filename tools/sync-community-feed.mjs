import fs from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const OUTPUT = new URL('../community-feed.json', import.meta.url);
const PAGE_LIMIT = Math.max(1, Math.min(100, Number(process.env.RCC_COMMUNITY_PAGES || 50)));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const text = (value, max = 180) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const iso = value => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const safeUrl = (value, allowed) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowed.includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
};
async function get(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${new URL(url).hostname}`);
  return response.json();
}
function unique(items) {
  const map = new Map();
  for (const item of items) if (item?.id && item?.url) map.set(item.id, item);
  return [...map.values()];
}
function fromScriptBlox(row) {
  if (!row || !row._id || !row.slug) return null;
  return {
    id: 'sb:' + text(row._id, 80), source: 'ScriptBlox',
    title: text(row.title, 120), game: text(row.game?.name || (row.isUniversal ? 'Universal' : 'Roblox'), 100),
    creator: text(row.owner?.username || row.creator?.username || 'Comunidad', 70),
    verified: row.verified === true || row.owner?.verified === true,
    keyRequired: row.key === true, patched: row.isPatched === true,
    createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
    views: Number(row.views || 0), likes: Number(row.likeCount || 0),
    url: 'https://scriptblox.com/script/' + encodeURIComponent(row.slug),
    sourceId: text(row._id, 80), tags: Array.isArray(row.tags) ? row.tags.map(v => text(v, 30)).filter(Boolean).slice(0, 8) : [],
    description: text(row.features || row.description || '', 240), codeIncluded: false
  };
}
function fromRscripts(row) {
  if (!row || !row.id || !row.slug) return null;
  const rawRisk = row.risk || {};
  return {
    id: 'rs:' + text(row.id, 80), source: 'Rscripts',
    title: text(row.title, 120), game: text(row.game?.title || 'Roblox', 100),
    creator: text(row.creator?.username || 'Comunidad', 70),
    verified: row.creator?.isVerified === true, keyRequired: row.noKeySystem === false,
    patched: false, createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt),
    views: Number(row.views || 0), likes: Number(row.likes || 0),
    url: 'https://rscripts.net/script/' + encodeURIComponent(row.slug),
    sourceId: text(row.id, 80), tags: [],
    description: text(row.description || '', 240),
    riskScore: Number.isFinite(rawRisk.score) ? rawRisk.score : null,
    riskLevel: text(rawRisk.level || 'Sin análisis', 30),
    obfuscated: rawRisk.isObfuscated === true, codeIncluded: false
  };
}
async function fetchScriptBloxPages(patched) {
  const items = [];
  for (let page = 1; page <= PAGE_LIMIT; page++) {
    const url = new URL('https://scriptblox.com/api/script/fetch');
    url.search = new URLSearchParams({ page: String(page), max: '20', mode: 'free', patched: patched ? '1' : '0', sortBy: 'createdAt', order: 'desc' }).toString();
    const data = await get(url);
    const rows = data?.result?.scripts || [];
    items.push(...rows.map(fromScriptBlox).filter(Boolean));
    if (rows.length < 20 || page >= Number(data?.result?.totalPages || PAGE_LIMIT)) break;
    await delay(160);
  }
  return items;
}
async function fetchScriptBlox() {
  const trendData = await get('https://scriptblox.com/api/script/trending');
  const trending = (trendData?.result?.scripts || []).map(fromScriptBlox).filter(Boolean);
  const [working, patched] = await Promise.all([
    fetchScriptBloxPages(false),
    fetchScriptBloxPages(true)
  ]);
  return { newest: unique([...working, ...patched]), trending: unique(trending) };
}
async function fetchRscripts() {
  const key = process.env.RSCRIPTS_API_KEY;
  if (!key) return { skipped: true, reason: 'RSCRIPTS_API_KEY no configurada', newest: [], trending: [] };
  const headers = { Authorization: 'Bearer ' + key };
  const trend = await get('https://api.rscripts.net/v1/trending', headers);
  const trending = [...(trend?.data?.rising || []), ...(trend?.data?.trending || [])].map(fromRscripts).filter(Boolean);
  const newest = [];
  for (let page = 1; page <= PAGE_LIMIT; page++) {
    const url = new URL('https://api.rscripts.net/v1/scripts');
    url.search = new URLSearchParams({ page: String(page), limit: '48', sort: 'newest', freeOnly: 'true', htmlDescription: 'false', includeScript: 'false' }).toString();
    const data = await get(url, headers);
    const rows = data?.data || [];
    newest.push(...rows.map(fromRscripts).filter(Boolean));
    if (!data?.meta?.hasNextPage || rows.length < 48) break;
    await delay(160);
  }
  return { newest: unique(newest), trending: unique(trending) };
}
const old = await fs.readFile(OUTPUT, 'utf8').then(JSON.parse).catch(() => null);
const results = await Promise.allSettled([fetchScriptBlox(), fetchRscripts()]);
const sources = {};
const newest = [];
const trending = [];
for (let i = 0; i < results.length; i++) {
  const name = i === 0 ? 'ScriptBlox' : 'Rscripts';
  const result = results[i];
  if (result.status === 'fulfilled') {
    sources[name] = { ok: !result.value.skipped, newest: result.value.newest.length, trending: result.value.trending.length, skipped: result.value.skipped || false, reason: result.value.reason || null };
    newest.push(...result.value.newest);
    trending.push(...result.value.trending);
  } else {
    sources[name] = { ok: false, error: text(result.reason?.message || result.reason, 180) };
  }
}
if (!newest.length && !trending.length) {
  if (old) throw new Error('Todas las fuentes fallaron; se conserva el feed anterior.');
  throw new Error('No fue posible obtener datos de ninguna fuente.');
}
const mergedNewest = unique(newest).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 3400);
const mergedTrending = unique(trending).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 300);
const payload = {
  schema: 'rcc-community-feed-v1',
  updatedAt: unchanged ? old.updatedAt : new Date().toISOString(),
  counts: { newest: mergedNewest.length, trending: mergedTrending.length, importedMetadata: mergedNewest.length },
  sources,
  notice: 'Descubrimientos externos: RCC muestra metadatos y enlaces originales. No aloja ni ejecuta el código de terceros.',
  newest: mergedNewest,
  trending: mergedTrending
};
await fs.writeFile(OUTPUT, JSON.stringify(payload) + '\n');
console.log(`RCC feed updated: ${mergedNewest.length} recent, ${mergedTrending.length} trending.`);
