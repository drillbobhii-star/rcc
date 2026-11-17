// Import public free Roblox/Luau metadata from the read-only RobloxScripts.com API.
// Attribution is required. RCC stores source links only and never downloads or executes third-party code.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const API = 'https://robloxscripts.com/api/v1/scripts';
const DENIED = /token.?steal|credential|password.?steal|cookie.?steal|account.?steal|grabber|phish|backdoor|malware|ransom|free.?robux|dupe.?robux|rat\b/i;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = (value, max = 300) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const dateOnly = value => {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
};
function trustedUrl(value, prefix) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['robloxscripts.com', 'www.robloxscripts.com'].includes(url.hostname.toLowerCase())) return null;
    if (!url.pathname.startsWith(prefix) || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}
async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'RCC-Catalog/1.0 (RobloxScripts.com public API; attribution included)' },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error('RobloxScripts.com HTTP ' + response.status);
        error.status = response.status;
        const retryAfter = Number(response.headers.get('retry-after'));
        if (response.status === 429 || response.status >= 500) {
          await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 30000) : 1200 * (attempt + 1));
          lastError = error;
          continue;
        }
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if ([400, 401, 403, 404].includes(error.status)) throw error;
      if (attempt < 3) await wait(700 * (attempt + 1));
    }
  }
  throw lastError || new Error('RobloxScripts.com no respondió.');
}
function rowToEntry(row, checkedAt = new Date().toISOString()) {
  if (!row || !/^[a-z0-9_-]{3,120}$/i.test(String(row.id || ''))) return null;
  const title = clean(row.title, 180);
  const slug = String(row.slug || '');
  const description = clean(row.description || (Array.isArray(row.features) ? row.features.join(' · ') : ''), 360);
  const searchText = [title, description, ...(Array.isArray(row.tags) ? row.tags : [])].join(' ');
  if (!title || DENIED.test(searchText) || row.accessType !== 'free') return null;
  if (!/^[a-z0-9][a-z0-9-]{0,180}$/i.test(slug)) return null;
  const source = trustedUrl(row.scriptPageUrl, '/');
  const raw = trustedUrl(row.rawScriptUrl, '/raw/');
  if (!source || !raw) return null;
  const gameName = clean(row.game?.name || (row.isUniversal === true ? 'Universal Script' : 'Roblox'), 140);
  const placeId = String(row.game?.placeId || '');
  const checkedDate = dateOnly(checkedAt);
  const tags = [...new Set([
    'Juegos', 'Comunidad', 'RobloxScripts.com', 'Acceso gratuito',
    ...(Array.isArray(row.tags) ? row.tags.map(tag => clean(tag, 40)).filter(Boolean).slice(0, 8) : []),
    ...(row.isUniversal === true ? ['Universal'] : [])
  ])].slice(0, 14);
  const author = clean(row.author?.username || 'Autor no indicado', 80);
  return {
    id: 'games_rbs_' + row.id,
    name: title,
    description: (description || gameName + '. Publicación pública gratuita de RobloxScripts.com.')
      + ' Fuente externa: robloxscripts.com. RCC solo enlaza la publicación; no descarga ni ejecuta el código.',
    level: 'free',
    device: 'unknown',
    platform: 'roblox',
    type: 'loadstring',
    executors: ['Ejecutor externo (sin verificar)'],
    tags,
    version: 'Sin versión publicada',
    created_at: dateOnly(row.createdAt),
    code: '-- RCC · Publicación externa de RobloxScripts.com; código no alojado ni auditado por RCC.\n'
      + '-- Autor indicado por la fuente: ' + author + '\n'
      + '-- Revisa la publicación original antes de usarla: ' + source + '\n'
      + 'loadstring(game:HttpGet(' + JSON.stringify(raw) + '))()',
    game: gameName,
    game_id: /^\d+$/.test(placeId) ? placeId : '0',
    catalog_section: 'games',
    source_only: true,
    review: {
      provider: 'RobloxScripts.com',
      source,
      checkedAt: checkedDate,
      status: 'unverified',
      commentsStatus: 'unavailable',
      declaredVerified: row.author?.verified === true,
      riskAssessment: 'No evaluado por RCC'
    },
    compatibility: {
      environment: 'client',
      runtime: 'Roblox · ejecutor externo',
      context: 'Ficha de metadatos de la API pública de RobloxScripts.com. El código se obtiene únicamente desde la publicación original.',
      requirements: 'Consulta la página original, permisos, dependencias y compatibilidad. RCC no verifica ejecutores ni ejecuta código externo.',
      verification: 'unverified',
      test_details: 'Metadatos públicos consultados el ' + checkedDate + '. RCC no descargó, auditó ni ejecutó el código.',
      mobile_status: 'PC, Android e iOS sin comprobar.',
      executor_status: 'unverified',
      sources: [source, raw],
      checked_at: checkedDate
    }
  };
}
async function main() {
  const target = Number(process.argv[2] || process.env.RCC_ROBLOXSCRIPTS_TARGET || 10000);
  const maxPages = Number(process.env.RCC_ROBLOXSCRIPTS_MAX_PAGES || 200);
  if (!Number.isSafeInteger(target) || target < 1 || target > 10000) throw new Error('Target RobloxScripts debe estar entre 1 y 10000.');
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 200) throw new Error('RobloxScripts admite como máximo 200 páginas.');
  const catalog = readCatalog();
  const ids = new Set(catalog.map(item => item.id));
  const sources = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  for (const item of catalog) if (typeof item.review?.source === 'string') sources.add(item.review.source);
  const checkedAt = new Date().toISOString();
  let added = 0, pagesChecked = 0, discovered = 0;
  for (let page = 1; page <= maxPages && added < target; page++) {
    const url = new URL(API);
    url.search = new URLSearchParams({ access: 'free', sort: 'newest', page: String(page), limit: '50' }).toString();
    let payload;
    try { payload = await getJson(url); }
    catch (error) { console.warn('RobloxScripts.com detenida en página ' + page + ': ' + error.message); break; }
    if (!Array.isArray(payload?.data)) throw new Error('RobloxScripts.com devolvió una respuesta sin data[].');
    const attribution = String(payload.meta?.attribution || '').toLowerCase();
    if (!attribution.includes('robloxscripts.com')) throw new Error('La respuesta no incluye la atribución requerida de robloxscripts.com.');
    pagesChecked++;
    discovered += payload.data.length;
    for (const row of payload.data) {
      if (added >= target) break;
      const entry = rowToEntry(row, checkedAt);
      if (!entry || ids.has(entry.id) || entry.compatibility.sources.some(source => sources.has(source))) continue;
      catalog.push(entry);
      ids.add(entry.id);
      entry.compatibility.sources.forEach(source => sources.add(source));
      added++;
    }
    const totalPages = Number(payload.pagination?.totalPages || payload.meta?.totalPages || 0);
    if (payload.data.length < 1 || (totalPages > 0 && page >= totalPages)) break;
    if (page < maxPages && added < target) await wait(1100);
    if (page % 20 === 0) console.log('RobloxScripts.com: ' + pagesChecked + ' páginas; ' + added + '/' + target + ' nuevas fichas.');
  }
  if (added > 0) writeCatalog(catalog);
  console.log('RobloxScripts.com: ' + added + ' fichas nuevas de ' + discovered + ' publicaciones revisadas en ' + pagesChecked + ' páginas; catálogo: ' + catalog.length + '.');
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { rowToEntry, trustedUrl };
