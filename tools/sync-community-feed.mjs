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

async function fetchGitHubTopic(topic, label) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RCC-Catalog/1.0' };
  if (process.env.GH_TOKEN) headers.Authorization = 'Bearer ' + process.env.GH_TOKEN;
  const url = new URL('https://api.github.com/search/repositories');
  url.search = new URLSearchParams({ q: 'topic:' + topic + ' fork:false archived:false', sort: 'updated', order: 'desc', per_page: '20' }).toString();
  const data = await get(url, headers);
  return (data.items || []).filter(row => row.html_url && row.full_name).map(row => ({
    id: 'gh:' + row.id, kind: 'repository', source: 'GitHub · ' + label,
    title: text(row.full_name, 120), game: label,
    creator: text(row.owner?.login || 'GitHub', 70),
    createdAt: iso(row.pushed_at || row.updated_at || row.created_at),
    updatedAt: iso(row.updated_at), views: Number(row.stargazers_count || 0),
    likes: Number(row.stargazers_count || 0), url: row.html_url,
    sourceId: String(row.id), language: text(row.language || '', 40),
    description: text(row.description || 'Repositorio público de código fuente.', 240),
    topics: Array.isArray(row.topics) ? row.topics.slice(0, 8).map(value => text(value, 32)) : [],
    codeIncluded: false, verified: false
  }));
}
async function fetchGitHubDiscoveries() {
  const topics = [
    ['roblox','Roblox / Luau'], ['fivem','FiveM'], ['java','Java'],
    ['javascript','JavaScript'], ['gameguardian','GameGuardian'],
    ['autotouch','AutoTouch'], ['minecraft-mods','Minecraft Mods'],
    ['godot','Godot'], ['unity','Unity'], ['python','Python']
  ];
  const settled = await Promise.allSettled(topics.map(([topic,label]) => fetchGitHubTopic(topic,label)));
  const items = [], sourceStatus = {};
  settled.forEach((result,index) => {
    const [topic,label] = topics[index];
    if (result.status === 'fulfilled') {
      sourceStatus[label] = { ok:true, count:result.value.length };
      items.push(...result.value);
    } else sourceStatus[label] = { ok:false, error:text(result.reason?.message || result.reason,160) };
  });
  return { items:unique(items), sources:sourceStatus };
}

const old = await fs.readFile(OUTPUT, 'utf8').then(JSON.parse).catch(() => null);
const results = await Promise.allSettled([fetchScriptBlox(), fetchRscripts(), fetchGitHubDiscoveries()]);
const sources = {};
const newest = [];
const trending = [];
for (let i = 0; i < results.length; i++) {
  const name = ['ScriptBlox','Rscripts','GitHub'][i];
  const result = results[i];
  if (result.status === 'fulfilled') {
    const sourceNewest = result.value.newest || result.value.items || [];\n    const sourceTrending = result.value.trending || [];\n    sources[name] = { ok: !result.value.skipped, newest: sourceNewest.length, trending: sourceTrending.length, skipped: result.value.skipped || false, reason: result.value.reason || null };
    newest.push(...(result.value.newest || []), ...(result.value.items || []));
    trending.push(...(result.value.trending || []));
    if (result.value.sources) Object.assign(sources, result.value.sources);
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
  updatedAt: new Date().toISOString(),
  counts: { newest: mergedNewest.length, trending: mergedTrending.length, importedMetadata: mergedNewest.length },
  sources,
  news: Array.isArray(old?.news) ? old.news : [],
  notice: 'Descubrimientos externos: RCC muestra metadatos y enlaces originales. No aloja ni ejecuta el código de terceros.',
  newest: mergedNewest,
  trending: mergedTrending
};
await fs.writeFile(OUTPUT, JSON.stringify(payload) + '\n');
console.log(`RCC feed updated: ${mergedNewest.length} recent, ${mergedTrending.length} trending.`);
