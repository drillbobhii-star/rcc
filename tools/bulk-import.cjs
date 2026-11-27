// RCC bulk catalog importer.
// Imports public metadata from supported APIs and optional allowlisted HTML sources.
// Third-party code is never executed. Raw-code ingestion is opt-in and risk-filtered.
const crypto = require('node:crypto');
const { readCatalog, writeCatalog, MAX_PART_BYTES } = require('./catalog-store.cjs');

const USER_AGENT = 'RCC-Catalog-BulkImporter/1.0 (+https://github.com/drillbobhii-star/rcc)';
const PAGE_SIZE = 20;
const MAX_PAGES = clampInt(process.env.RCC_BULK_MAX_PAGES, 1, 200, 25);
const TARGET = clampInt(process.env.RCC_BULK_TARGET, 1, 10000, 1500);
const INCLUDE_CODE = process.env.RCC_BULK_IMPORT_INCLUDE_CODE === '1';
const DRY_RUN = process.argv.includes('--dry-run');
const WAIT_MS = clampInt(process.env.RCC_BULK_DELAY_MS, 250, 10000, 900);
const DENIED = /\b(keylogger|stealer|credential.?theft|cookie.?steal|token.?steal|password.?steal|phishing|ransomware|malware|backdoor|rat\b|grabber|free.?robux|account.?takeover)\b/i;
const DANGEROUS_CODE = /\b(getgenv|syn\.request|http_request|hookmetamethod|getrawmetatable|identifyexecutor|queue_on_teleport|setclipboard|writefile|readfile|delfile|makefolder|loadstring)\b|game\s*:\s*HttpGet|request\s*\(\s*\{\s*Url/i;
const SOURCES = {
  scriptblox: 'https://scriptblox.com',
  robloxscripts: 'https://robloxscripts.com',
  rscripts: 'https://api.rscripts.net'
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function clampInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}
function clean(value, max = 260) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function normalizedCode(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim().replace(/[ \t]+$/gm, '');
}
function safeUrl(value, hosts, pathPrefix) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !hosts.includes(url.hostname.toLowerCase()) || url.username || url.password || url.hash) return null;
    if (pathPrefix && !url.pathname.startsWith(pathPrefix)) return null;
    return url.href;
  } catch { return null; }
}
function safeRobloxTitle(title, description = '') {
  const text = title + ' ' + description;
  return Boolean(title) && !DENIED.test(text);
}
async function fetchResponse(url, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: { 'User-Agent': USER_AGENT, Accept: options.accept || 'application/json,text/html;q=0.9,*/*;q=0.8', ...options.headers },
        signal: AbortSignal.timeout(20000)
      });
      if (response.ok) return response;
      const error = new Error('HTTP ' + response.status + ' en ' + new URL(url).hostname);
      error.status = response.status;
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) throw error;
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, 30000) : 700 * (attempt + 1));
      lastError = error;
    } catch (error) {
      lastError = error;
      if (error.status && ![408, 425, 429, 500, 502, 503, 504].includes(error.status)) throw error;
      if (attempt < 3) await sleep(500 * (attempt + 1));
    }
  }
  throw lastError || new Error('No se pudo completar la solicitud.');
}
async function fetchJson(url, headers = {}) {
  const response = await fetchResponse(url, { headers, accept: 'application/json' });
  return response.json();
}
async function fetchText(url) {
  const response = await fetchResponse(url, { accept: 'text/plain,text/html;q=0.9,*/*;q=0.8' });
  return response.text();
}
function makeEntry({ id, title, description, source, rawUrl, code, provider, game, author, tags, risk }) {
  title = clean(title, 180);
  description = clean(description, 500);
  source = safeUrl(source, [new URL(source).hostname]);
  if (!id || !source || !safeRobloxTitle(title, description)) return null;
  const raw = rawUrl ? safeUrl(rawUrl, [new URL(source).hostname]) : null;
  const checkedAt = new Date().toISOString();
  const body = normalizedCode(code);
  const codeHash = body ? sha256(body) : null;
  const suspicious = body && (DENIED.test(body) || DANGEROUS_CODE.test(body) || body.length > 150000 || body.includes('\0'));
  const acceptedCode = INCLUDE_CODE && body && !suspicious ? body : null;
  const safeTags = [...new Set(['RCC', 'Roblox', 'Luau', provider, ...((tags || []).map(x => clean(x, 36)).filter(Boolean))])].slice(0, 14);
  return {
    id: 'bulk_' + provider.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + sha256(String(id)).slice(0, 18),
    name: title,
    description: (description || 'Publicación externa de Roblox.') + ' Fuente: ' + provider + '. Código no ejecutado por RCC; verifica permisos, dependencias y compatibilidad.',
    level: acceptedCode ? 'external' : 'external',
    device: 'unknown',
    platform: 'roblox',
    type: 'source',
    source_only: !acceptedCode,
    source_url: source,
    code_hash: codeHash || sha256(source),
    executors: ['Roblox Studio / entorno externo sin verificar'],
    tags: safeTags,
    version: 'Fuente externa',
    created_at: checkedAt.slice(0, 10),
    code: acceptedCode || ('-- RCC: código no incluido automáticamente.\\n-- Fuente original: ' + source + (raw ? '\\n-- Código original: ' + raw : '') + '\\n-- Revisa el contenido y sus permisos antes de usarlo.'),
    game: clean(game || 'Roblox', 120),
    game_id: '0',
    catalog_section: 'games',
    review: {
      provider,
      source,
      checkedAt: checkedAt.slice(0, 10),
      status: 'unverified',
      riskAssessment: suspicious ? 'Código rechazado por filtros automáticos; solo se conserva la ficha.' : 'No auditado por RCC.',
      author: clean(author || 'No indicado', 80)
    },
    compatibility: {
      environment: 'external',
      runtime: 'Roblox / Luau',
      verification: 'source-linked',
      executor_status: 'unverified',
      mobile_status: 'Sin comprobar',
      test_details: 'Metadatos consultados; RCC no ejecutó el contenido.',
      sources: [...new Set([source, ...(raw ? [raw] : [])])],
      code_hash: codeHash,
      checked_at: checkedAt.slice(0, 10),
      risk
    }
  };
}
function scriptBloxRows(payload) {
  const rows = payload?.result?.scripts || payload?.result?.data || payload?.scripts || [];
  return Array.isArray(rows) ? rows : [];
}
async function importScriptBlox(existing) {
  const added = [];
  for (let page = 1; page <= MAX_PAGES && added.length < TARGET; page++) {
    const url = new URL('/api/script/fetch', SOURCES.scriptblox);
    url.search = new URLSearchParams({ page: String(page), max: String(PAGE_SIZE), mode: 'free', patched: '0' }).toString();
    const payload = await fetchJson(url);
    const rows = scriptBloxRows(payload);
    if (!rows.length) break;
    for (const row of rows) {
      if (added.length >= TARGET) break;
      const slug = String(row.slug || row._id || row.id || '');
      if (!slug) continue;
      const detailUrl = new URL('/api/script/' + encodeURIComponent(slug), SOURCES.scriptblox).href;
      let detail = row;
      let rawUrl = null;
      let code = row.script || row.code || '';
      try {
        const detailPayload = await fetchJson(detailUrl);
        detail = detailPayload?.script || detailPayload?.result || detailPayload?.data || detailPayload || row;
        rawUrl = new URL('/api/script/raw/' + encodeURIComponent(slug), SOURCES.scriptblox).href;
        if (INCLUDE_CODE && !code) {
          try { code = await fetchText(rawUrl); } catch {}
        }
      } catch {}
      const source = new URL('/script/' + encodeURIComponent(slug), SOURCES.scriptblox).href;
      const entry = makeEntry({
        id: slug, title: detail.title || row.title, description: detail.features || detail.description || row.description,
        source, rawUrl, code, provider: 'ScriptBlox', game: detail.game?.name || row.game?.name,
        author: detail.owner?.username || detail.creator?.username || row.owner?.username,
        tags: detail.tags || row.tags
      });
      if (entry && !isDuplicate(entry, existing, added)) added.push(entry);
    }
    console.log('ScriptBlox página ' + page + ': ' + added.length + ' nuevas fichas.');
    if (rows.length < PAGE_SIZE) break;
    await sleep(WAIT_MS);
  }
  return added;
}
async function importRobloxScripts(existing) {
  const added = [];
  for (let page = 1; page <= MAX_PAGES && added.length < TARGET; page++) {
    const url = new URL('/api/v1/scripts', SOURCES.robloxscripts);
    url.search = new URLSearchParams({ access: 'free', sort: 'newest', page: String(page), limit: '50' }).toString();
    const payload = await fetchJson(url);
    if (!Array.isArray(payload?.data)) break;
    if (!String(payload.meta?.attribution || '').toLowerCase().includes('robloxscripts.com')) throw new Error('RobloxScripts: falta la atribución oficial.');
    for (const row of payload.data) {
      if (added.length >= TARGET) break;
      const source = safeUrl(row.scriptPageUrl, ['robloxscripts.com', 'www.robloxscripts.com']);
      const rawUrl = safeUrl(row.rawScriptUrl, ['robloxscripts.com', 'www.robloxscripts.com']);
      if (!source || !rawUrl) continue;
      let code = row.script || '';
      if (INCLUDE_CODE && !code) {
        try { code = await fetchText(rawUrl); } catch {}
      }
      const entry = makeEntry({
        id: row.id, title: row.title, description: row.description,
        source, rawUrl, code, provider: 'RobloxScripts.com',
        game: row.game?.name || (row.isUniversal ? 'Universal' : 'Roblox'),
        author: row.author?.username, tags: row.tags
      });
      if (entry && !isDuplicate(entry, existing, added)) added.push(entry);
    }
    if (!payload.data.length || payload.data.length < 50 || page >= Number(payload.pagination?.totalPages || 999)) break;
    await sleep(WAIT_MS);
  }
  return added;
}
async function importRScripts(existing) {
  const key = process.env.RSCRIPTS_API_KEY || process.env.RSCRIPT_API_KEY;
  if (!key) return [];
  const added = [];
  for (let page = 1; page <= Math.min(MAX_PAGES, 200) && added.length < TARGET; page++) {
    const url = new URL('/v1/scripts', SOURCES.rscripts);
    url.search = new URLSearchParams({ page: String(page), limit: '48', sort: 'newest', freeOnly: 'true', includeScript: String(INCLUDE_CODE) }).toString();
    const payload = await fetchJson(url, { Authorization: 'Bearer ' + key });
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    for (const row of rows) {
      if (added.length >= TARGET) break;
      const source = 'https://rscripts.net/script/' + encodeURIComponent(String(row.slug || ''));
      const rawUrl = safeUrl(row.rawScript, ['rscripts.net', 'www.rscripts.net']);
      const risk = row.risk?.score;
      if (Number.isFinite(risk) && risk > 3) continue;
      if (row.risk?.isObfuscated === true) continue;
      const entry = makeEntry({
        id: row.id || row.slug, title: row.title, description: row.description,
        source, rawUrl, code: row.script || '', provider: 'Rscripts.net',
        game: row.game?.title || 'Roblox', author: row.creator?.username,
        tags: row.tags, risk: row.risk || null
      });
      if (entry && !isDuplicate(entry, existing, added)) added.push(entry);
    }
    if (!rows.length || rows.length < 48 || page >= Number(payload.meta?.totalPages || 999)) break;
    await sleep(WAIT_MS);
  }
  return added;
}
function htmlDecode(value) {
  return String(value).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
}
function extractCodeFromHtml(html) {
  const matches = [...String(html).matchAll(/<(?:pre|code)\b[^>]*>([\s\S]*?)<\/(?:pre|code)>/gi)];
  const candidates = matches.map(match => htmlDecode(match[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')));
  return candidates.sort((a, b) => b.length - a.length)[0] || '';
}
async function importAllowlistedPages(existing) {
  const urls = String(process.env.RCC_BULK_SOURCE_URLS || '').split(/\s*,\s*/).filter(Boolean);
  const added = [];
  for (const value of urls) {
    if (added.length >= TARGET) break;
    const url = safeUrl(value, ['wearedevs.net', 'www.wearedevs.net', 'rscripts.info', 'www.rscripts.info', 'pastebin.com', 'www.pastebin.com']);
    if (!url) { console.warn('URL externa ignorada: dominio o protocolo no permitido.'); continue; }
    try {
      const html = await fetchText(url);
      const code = extractCodeFromHtml(html);
      const title = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || new URL(url).pathname.split('/').pop(), 160);
      const provider = new URL(url).hostname.replace(/^www\./, '');
      const entry = makeEntry({ id: url, title, description: 'Ficha recogida desde una URL pública permitida.', source: url, rawUrl: null, code, provider, game: 'Roblox' });
      if (entry && !isDuplicate(entry, existing, added)) added.push(entry);
    } catch (error) { console.warn(providerName(url) + ': ' + error.message); }
    await sleep(WAIT_MS);
  }
  return added;
}
function providerName(url) { try { return new URL(url).hostname; } catch { return 'Fuente'; } }
async function searchWebUrls() {
  const found = [];
  const query = 'Roblox Studio Luau open source scripts GitHub examples';
  if (process.env.SERPER_API_KEY) {
    const payload = await fetchJson('https://google.serper.dev/search', {
      'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json'
    }).catch(async () => {
      const response = await fetchResponse('https://google.serper.dev/search', {
        method: 'POST', headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: 20 }), accept: 'application/json'
      });
      return response.json();
    });
    for (const row of payload.organic || []) if (row.link) found.push(row.link);
  } else if (process.env.TAVILY_API_KEY) {
    const response = await fetchResponse('https://api.tavily.com/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: 'advanced', max_results: 20 }),
      accept: 'application/json'
    });
    const payload = await response.json();
    for (const row of payload.results || []) if (row.url) found.push(row.url);
  }
  return [...new Set(found)].filter(value => {
    try {
      const host = new URL(value).hostname.toLowerCase();
      return host === 'github.com' || host.endsWith('.github.io') || host === 'create.roblox.com';
    } catch { return false; }
  });
}
function isDuplicate(entry, existing, batch) {
  const id = entry.id;
  const hash = entry.code_hash;
  const source = entry.source_url;
  return existing.ids.has(id) || existing.hashes.has(hash) || existing.sources.has(source)
    || batch.some(row => row.id === id || row.code_hash === hash || row.source_url === source);
}
function buildIndex(rows) {
  const ids = new Set(), hashes = new Set(), sources = new Set();
  for (const row of rows) {
    if (row.id) ids.add(row.id);
    if (row.code_hash) hashes.add(row.code_hash);
    if (row.source_url) sources.add(row.source_url);
    for (const url of row.compatibility?.sources || []) sources.add(url);
    if (row.code) hashes.add(sha256(normalizedCode(row.code)));
  }
  return { ids, hashes, sources };
}
async function main() {
  const catalog = readCatalog();
  const existing = buildIndex(catalog);
  const collected = [];
  const reports = [];
  const sources = [
    ['ScriptBlox', importScriptBlox],
    ['RobloxScripts.com', importRobloxScripts],
    ['Rscripts.net', importRScripts],
    ['Web allowlist', importAllowlistedPages]
  ];
  for (const [name, importer] of sources) {
    try {
      const entries = await importer(existing);
      for (const entry of entries) {
        if (!isDuplicate(entry, existing, collected)) collected.push(entry);
      }
      reports.push({ source: name, added: entries.length, status: 'ok' });
    } catch (error) {
      reports.push({ source: name, added: 0, status: 'error', error: error.message });
      console.warn(name + ': ' + error.message);
    }
    if (collected.length >= TARGET) break;
  }
  if ((process.env.SERPER_API_KEY || process.env.TAVILY_API_KEY) && collected.length < TARGET) {
    try {
      const urls = await searchWebUrls();
      console.log('Búsqueda web: ' + urls.length + ' URLs de repositorios/proyectos permitidos encontradas; no se importan binarios ni código sin licencia.');
      reports.push({ source: 'Google search (Serper/Tavily)', discovered: urls.length, status: 'discovery-only' });
    } catch (error) {
      reports.push({ source: 'Google search (Serper/Tavily)', status: 'error', error: error.message });
    }
  }
  const unique = collected.filter((entry, index, all) => all.findIndex(other => other.id === entry.id) === index);
  const next = catalog.concat(unique);
  const manifestBytes = Buffer.byteLength(JSON.stringify({ format: 'rcc-catalog-v1', total: next.length, parts: [] }));
  if (!DRY_RUN && unique.length) {
    writeCatalog(next);
    const verified = readCatalog();
    if (verified.length !== next.length) throw new Error('Verificación posterior a la escritura fallida.');
  }
  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    includeCode: INCLUDE_CODE,
    catalogBefore: catalog.length,
    discovered: collected.length,
    added: unique.length,
    duplicatesSkipped: Math.max(0, collected.length - unique.length),
    catalogAfter: next.length,
    maxPartBytes: MAX_PART_BYTES,
    manifestBytes,
    reports
  }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { makeEntry, safeUrl, extractCodeFromHtml, normalizedCode, buildIndex };
