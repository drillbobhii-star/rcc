// Import public FiveM release metadata from the official Cfx.re Releases category.
// RCC stores link cards only. It does not download, rehost, or execute third-party resources.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');
const SOURCE_BASE = 'https://forum.cfx.re';
const CATEGORY_URL = SOURCE_BASE + '/c/releases/7.json';
const SCRIPT_TAGS = new Set(['script', 'fivem', 'fivem-scripts', 'esx', 'qbcore', 'qbox', 'standalone', 'ox']);
const DENIED = /token.?steal|credential|password.?steal|cookie.?steal|rat\b|backdoor|ransom|malware|phish/i;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = (value, max = 500) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const dateOnly = value => {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
};
function isFiveMResource(topic) {
  const tags = Array.isArray(topic?.tags) ? topic.tags.map(tag => String(tag).toLowerCase()) : [];
  const titleAndExcerpt = String(topic?.title || '') + ' ' + String(topic?.excerpt || '');
  const taggedScript = tags.some(tag => SCRIPT_TAGS.has(tag));
  const nonScriptAsset = tags.some(tag => ['map', 'vehicle', 'car', 'clothing', 'weapon', 'texture', 'ped', 'prop', 'ymap'].includes(tag));
  if (nonScriptAsset) return false;
  return taggedScript
    || (/\b(script|resource)\b/i.test(titleAndExcerpt) && /\b(fivem|esx|qbcore|qbox|fxserver)\b/i.test(titleAndExcerpt));
}
function topicToEntry(topic, checkedAt = new Date().toISOString()) {
  if (!topic || !/^\d+$/.test(String(topic.id || '')) || typeof topic.slug !== 'string') return null;
  const title = clean(topic.fancy_title || topic.title, 180);
  const excerpt = clean(topic.excerpt || '', 520);
  if (!title || DENIED.test(title + ' ' + excerpt) || !isFiveMResource(topic)) return null;
  const id = 'fivem_cfx_' + topic.id;
  const source = SOURCE_BASE + '/t/' + encodeURIComponent(topic.slug) + '/' + topic.id;
  const tags = Array.isArray(topic.tags) ? topic.tags.map(tag => clean(tag, 40).toLowerCase()).filter(Boolean) : [];
  const pricing = tags.includes('paid') ? 'paid' : tags.includes('free') ? 'free' : 'unknown';
  const author = clean(topic.last_poster_username || topic.posters?.at(-1)?.username || 'Comunidad Cfx.re', 100);
  const createdAt = dateOnly(topic.created_at);
  const checkedDate = dateOnly(checkedAt);
  const labels = ['FiveM', 'Cfx.re', 'Recurso externo', ...tags.slice(0, 8)];
  if (pricing === 'paid') labels.push('Listado de pago');
  else if (pricing === 'free') labels.push('Marcado gratuito por Cfx.re');
  else labels.push('Precio no indicado');
  return {
    id, name: title,
    description: (excerpt || 'Publicación de recurso en la categoría Releases de Cfx.re.') + ' Fuente externa. RCC no aloja, descarga ni ejecuta el recurso.',
    level: pricing === 'paid' ? 'paid' : pricing === 'free' ? 'free' : 'external',
    device: 'pc', platform: 'fivem', type: 'source', executors: ['FiveM / FXServer'],
    tags: labels, version: 'Publicación comunitaria', created_at: createdAt,
    code: '-- RCC · Ficha externa de FiveM; este registro no contiene el código del recurso.\n'
      + '-- Autor/última actividad mostrada por el foro: ' + author + '\n'
      + '-- Abre la publicación original y revisa licencia, dependencias y compatibilidad:\n'
      + '-- ' + source + '\n',
    game: 'FiveM / GTA V', game_id: 'fivem', catalog_section: 'fivem', source_only: true,
    review: { provider: 'Cfx.re Forum', source, checkedAt: checkedDate, status: 'unverified', riskAssessment: 'No evaluado por RCC' },
    compatibility: {
      environment: 'server', runtime: 'FiveM / FXServer',
      context: 'Índice de una publicación de la categoría Releases de Cfx.re. No es código ejecutable dentro de RCC.',
      requirements: 'Consulta en la fuente original el framework, versión de FXServer, dependencias, licencia, precio y pasos de instalación.',
      verification: 'source-linked',
      test_details: 'Metadatos públicos consultados el ' + checkedDate + '. RCC no descargó, auditó ni ejecutó el recurso.',
      mobile_status: 'No aplica: recurso para servidor FiveM.', executor_status: 'not-applicable',
      sources: [source], checked_at: checkedDate, pricing_status: pricing
    }
  };
}
async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'RCC-Catalog/1.0 (Cfx.re public release index)' },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error('Cfx.re HTTP ' + response.status);
        error.status = response.status;
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 15000) : 750 * (attempt + 1));
          lastError = error; continue;
        }
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if ([400, 401, 403, 404].includes(error.status)) throw error;
      if (attempt < 3) await wait(400 * (attempt + 1));
    }
  }
  throw lastError || new Error('Cfx.re no respondió.');
}
async function main() {
  const target = Number(process.argv[2] || process.env.RCC_FIVEM_TARGET || 1200);
  const maxPages = Number(process.env.RCC_FIVEM_MAX_PAGES || 120);
  if (!Number.isSafeInteger(target) || target < 1 || target > 4000) throw new Error('El objetivo FiveM debe estar entre 1 y 4000.');
  const catalog = readCatalog();
  const ids = new Set(catalog.map(item => item.id));
  const sources = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  for (const item of catalog) if (typeof item.review?.source === 'string') sources.add(item.review.source);
  const checkedAt = new Date().toISOString();
  let added = 0, pagesChecked = 0, discovered = 0;
  for (let page = 0; page < maxPages && added < target; page++) {
    const url = new URL(CATEGORY_URL); url.searchParams.set('page', String(page));
    let payload;
    try { payload = await getJson(url); }
    catch (error) { console.warn('Cfx.re detenido en página ' + page + ': ' + error.message); break; }
    const list = payload?.topic_list;
    const topics = Array.isArray(list?.topics) ? list.topics : [];
    if (!topics.length) break;
    pagesChecked++; discovered += topics.length;
    for (const topic of topics) {
      if (added >= target) break;
      const entry = topicToEntry(topic, checkedAt);
      if (!entry || ids.has(entry.id) || sources.has(entry.review.source)) continue;
      catalog.push(entry); ids.add(entry.id); sources.add(entry.review.source); added++;
    }
    const hasMore = typeof list.more_topics_url === 'string' && list.more_topics_url.length > 0;
    if (!hasMore || topics.length < Number(list.per_page || 30)) break;
    await wait(140);
  }
  if (added > 0) writeCatalog(catalog);
  console.log('FiveM Cfx.re: ' + added + ' fichas nuevas de ' + discovered + ' temas revisados en ' + pagesChecked + ' páginas; catálogo: ' + catalog.length + '.');
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { isFiveMResource, topicToEntry };
