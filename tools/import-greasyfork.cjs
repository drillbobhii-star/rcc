// Import metadata-only cards from Greasy Fork's public read-only JSON API.
// User-script source code is not copied or rehosted by this importer.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const API = 'https://api.greasyfork.org/scripts.json';
const WAIT = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = (value, max = 260) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, max);
const DENIED = /\\b(keylogger|stealer|credential.?theft|cookie.?steal|token.?steal|password.?steal|phishing|ransomware|malware|ad.?fraud|paywall.?bypass)\\b/i;
const MAX_TARGET = 5000;

function safeUrl(value, hosts) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname.toLowerCase()) || url.username || url.password || url.hash) return null;
    return url.href;
  } catch {
    return null;
  }
}
function licenseName(value) {
  if (typeof value === 'string') return clean(value, 80);
  if (value && typeof value === 'object') return clean(value.name || value.spdx_id || value.url || '', 80);
  return '';
}
function normalizeScript(row, checkedAt = new Date().toISOString()) {
  const id = String(row?.id ?? '');
  if (!/^\\d{1,12}$/.test(id)) return null;
  const title = clean(row.name || row.title, 140);
  const description = clean(row.description || '', 320);
  if (!title || DENIED.test(title + ' ' + description)) return null;
  const source = safeUrl(row.url || ('https://greasyfork.org/en/scripts/' + id), ['greasyfork.org','www.greasyfork.org']);
  if (!source || !new URL(source).pathname.includes('/scripts/')) return null;
  const codeUrl = safeUrl(row.code_url || '', ['update.greasyfork.org','greasyfork.org','www.greasyfork.org']);
  const license = licenseName(row.license || row.license_name);
  const tags = ['RCC', 'JavaScript / Web', 'Userscript', 'Navegador'];
  if (license) tags.push('Licencia declarada: ' + license);
  const installs = Number(row.total_installs || row.total_installs_count || 0);
  const daily = Number(row.daily_installs || 0);
  return {
    id: 'greasyfork_' + id,
    name: title,
    description: (description || 'Userscript público para navegador.') + ' Ficha externa: revisa permisos, dominios de ejecución, licencia y opiniones antes de instalar. RCC no descarga ni ejecuta el código.',
    level: 'external',
    device: 'unknown',
    platform: 'web',
    type: 'source',
    source_only: true,
    source_url: source,
    file_extension: 'user.js',
    executors: ['Tampermonkey / Greasemonkey / Violentmonkey (compatibilidad variable)'],
    tags,
    version: clean(row.version || 'Sin versión indicada', 60),
    created_at: row.created_at && Number.isFinite(Date.parse(row.created_at))
      ? new Date(row.created_at).toISOString().slice(0, 10)
      : checkedAt.slice(0, 10),
    code: '// RCC: ficha externa. Abre la publicación original para consultar código, licencia y permisos.',
    game: 'JavaScript / navegador',
    game_id: 'greasyfork',
    catalog_section: 'web',
    source_only: true,
    review: {
      provider: 'Greasy Fork',
      source,
      checkedAt: checkedAt.slice(0, 10),
      status: 'unverified',
      riskAssessment: 'No evaluado por RCC; revisa comentarios y permisos en la publicación original.'
    },
    compatibility: {
      environment: 'browser',
      runtime: 'JavaScript · gestor de userscripts',
      context: 'Userscript para los sitios declarados por el autor en sus metadatos.',
      requirements: 'Instala un gestor de userscripts compatible y revisa @match, @include, @grant, @connect y @require antes de habilitarlo.',
      verification: 'source-linked',
      executor_status: 'not-applicable',
      mobile_status: 'Depende del navegador y gestor de userscripts.',
      test_details: 'Se importaron metadatos públicos; RCC no descargó ni ejecutó el código.',
      sources: [source, ...(codeUrl ? [codeUrl] : [])],
      license,
      total_installs: Number.isFinite(installs) ? installs : 0,
      daily_installs: Number.isFinite(daily) ? daily : 0,
      checked_at: checkedAt.slice(0, 10)
    }
  };
}
async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'RCC-Catalog/1.0 (public metadata indexer)' },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error('Greasy Fork HTTP ' + response.status);
        error.status = response.status;
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await WAIT(retryAfter > 0 ? Math.min(retryAfter * 1000, 30000) : 900 * (attempt + 1));
          lastError = error;
          continue;
        }
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if ([400,401,403,404].includes(error.status)) throw error;
      if (attempt < 3) await WAIT(600 * (attempt + 1));
    }
  }
  throw lastError || new Error('Greasy Fork no respondió.');
}
async function main() {
  const target = Number(process.argv[2] || process.env.RCC_GREASYFORK_TARGET || 2500);
  const maxPages = Math.max(1, Math.min(100, Number(process.env.RCC_GREASYFORK_MAX_PAGES || 50)));
  if (!Number.isSafeInteger(target) || target < 1 || target > MAX_TARGET) throw new Error('Target Greasy Fork debe estar entre 1 y 5000.');
  const catalog = readCatalog();
  const ids = new Set(catalog.map(item => item.id));
  const urls = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  for (const item of catalog) if (item.source_url) urls.add(item.source_url);
  const checkedAt = new Date().toISOString();
  let pagesChecked = 0, discovered = 0, added = 0;
  for (let page = 1; page <= maxPages && added < target; page++) {
    const url = new URL(API);
    url.search = new URLSearchParams({ page: String(page), sort: 'updated', language: 'js', filter_locale: 'false' }).toString();
    const payload = await getJson(url);
    const rows = Array.isArray(payload) ? payload : (payload.scripts || payload.data || []);
    if (!Array.isArray(rows)) throw new Error('Greasy Fork devolvió una respuesta sin una lista de scripts.');
    pagesChecked++;
    discovered += rows.length;
    for (const row of rows) {
      if (added >= target) break;
      const entry = normalizeScript(row, checkedAt);
      if (!entry || ids.has(entry.id) || urls.has(entry.source_url)) continue;
      ids.add(entry.id);
      urls.add(entry.source_url);
      catalog.push(entry);
      added++;
    }
    if (rows.length < 100) break;
    if (page < maxPages && added < target) await WAIT(350);
  }
  if (added) writeCatalog(catalog);
  console.log(JSON.stringify({ source: 'Greasy Fork', pagesChecked, discovered, added, target, total: catalog.length }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { normalizeScript, safeUrl };
