// Import public, free and risk-screened RScripts metadata from the current v1 API.
// The API key is read only from the GitHub Actions secret; raw Lua is never fetched.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const DENIED = /steal|token.?log|cookie.?log|account.?hack|beam|phish|grabber|dupe.?robux|free.?robux|password.?steal/i;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = (value, max = 180) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const dateOnly = value => {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
};

async function getJson(url, token) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'User-Agent': 'RCC-Catalog/1.0' },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error('RScripts HTTP ' + response.status);
        error.status = response.status;
        const retryAfter = Number(response.headers.get('retry-after'));
        if (response.status === 429 || response.status >= 500) {
          await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 15000) : 800 * (attempt + 1));
          lastError = error;
          continue;
        }
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if ([400, 401, 403, 404].includes(error.status)) throw error;
      if (attempt < 3) await wait(500 * (attempt + 1));
    }
  }
  throw lastError || new Error('RScripts no respondió.');
}

function safeImage(value) {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = host.endsWith('.rbxcdn.com')
      || host === 'rscripts.net'
      || host.endsWith('.rscripts.net');
    if (url.protocol !== 'https:' || !allowed) return undefined;
    if (host.includes('rscripts.net') && !/^\/assets\/(games|scripts)\//.test(url.pathname)) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

async function main() {
  const token = process.env.RSCRIPTS_API_KEY?.trim();
  if (!token) {
    console.log('RScripts: importación omitida; configura RSCRIPTS_API_KEY en GitHub Actions.');
    return;
  }

  const target = Number(process.argv[2] || process.env.RCC_RSCRIPTS_TARGET || 500);
  if (!Number.isSafeInteger(target) || target < 1 || target > 5000) {
    throw new Error('Target RScripts debe estar entre 1 y 5000.');
  }

  const catalog = readCatalog();
  const ids = new Set(catalog.map(item => item.id));
  const sources = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  for (const item of catalog) {
    const raw = item.code?.match(/https:\/\/(?:scriptblox\.com|rscripts\.net)\/raw\/[^\s"')]+/i)?.[0];
    if (raw) sources.add(raw);
  }

  const checkedAt = new Date().toISOString();
  let added = 0;
  let pagesChecked = 0;
  const maxPages = 200;

  for (let page = 1; page <= maxPages && added < target; page++) {
    const url = new URL('https://api.rscripts.net/v1/scripts');
    url.search = new URLSearchParams({
      page: String(page),
      limit: '48',
      sort: 'newest',
      freeOnly: 'true',
      includeScript: 'false',
      htmlDescription: 'false'
    }).toString();

    let payload;
    try {
      payload = await getJson(url, token);
    } catch (error) {
      console.warn('RScripts detenida en página ' + page + ': ' + error.message);
      break;
    }
    if (payload?.success !== true || !Array.isArray(payload.data)) {
      throw new Error('RScripts devolvió una respuesta v1 inesperada.');
    }
    pagesChecked++;

    for (const row of payload.data) {
      if (added >= target) break;
      const sourceId = String(row?.id || '');
      const slug = String(row?.slug || '');
      const title = clean(row?.title, 180);
      const risk = row?.risk;
      const riskLevel = clean(risk?.level || '', 30).toLowerCase();
      const riskScore = Number(risk?.score);
      const isReviewedLowRisk = ['safe', 'low risk'].includes(riskLevel)
        && Number.isFinite(riskScore) && riskScore >= 1 && riskScore <= 4
        && risk?.isObfuscated !== true;
      if (!/^[a-f0-9]{24}$/i.test(sourceId)) continue;
      if (!/^[a-z0-9][a-z0-9-]{0,180}$/i.test(slug)) continue;
      if (!title || DENIED.test(title) || row.isPaid === true || row.isPatched === true || !isReviewedLowRisk) continue;

      let rawUrl;
      try {
        rawUrl = new URL(row.rawScript);
      } catch {
        continue;
      }
      if (rawUrl.protocol !== 'https:' || rawUrl.hostname !== 'rscripts.net'
        || !/^\/raw\/[a-z0-9._-]+\.txt$/i.test(rawUrl.pathname) || rawUrl.search || rawUrl.hash) continue;

      const id = 'games_rs_' + sourceId;
      const source = 'https://rscripts.net/script/' + encodeURIComponent(slug);
      const raw = rawUrl.href;
      if (ids.has(id) || sources.has(source) || sources.has(raw)) continue;

      const gameName = clean(row.game?.title || 'Universal Script', 180);
      const gameId = /^\d+$/.test(String(row.game?.placeId || '')) ? String(row.game.placeId) : '0';
      const createdAt = dateOnly(row.createdAt);
      const image = safeImage(row.game?.thumbnailUrl || row.imageUrl);
      const executorNames = Array.isArray(row.executors)
        ? row.executors.map(executor => clean(executor?.name, 70)).filter(Boolean).slice(0, 8)
        : [];
      const tags = ['RCC', 'Juegos', 'Comunidad', riskLevel === 'safe' ? 'Riesgo bajo' : 'Riesgo evaluado'];
      if (row.isKeySystem === true) tags.push('Con clave');
      if (row.isMobileReady === true) tags.push('Móvil indicado por la fuente');

      catalog.push({
        id,
        ...(image ? { reference_image: image } : {}),
        name: title,
        description: clean(row.description || (gameName + '. Publicación gratuita con metadatos externos.'), 300)
          + ' Fuente externa; RCC no ha descargado ni ejecutado este código.',
        level: 'free',
        device: 'unknown',
        platform: 'roblox',
        type: 'loadstring',
        executors: executorNames.length ? executorNames : ['Ejecutor externo (sin verificar)'],
        tags,
        version: 'Sin versión publicada',
        created_at: createdAt,
        code: '-- RCC: loader externo no verificado. Revisa la evaluación de riesgo y el código original antes de usarlo.\n'
          + '-- Fuente: ' + source + '\n'
          + 'loadstring(game:HttpGet(' + JSON.stringify(raw) + '))()',
        game: gameName,
        game_id: gameId,
        catalog_section: 'games',
        review: {
          provider: 'RScripts',
          source,
          checkedAt,
          status: row.isPatched === true ? 'patched' : row.isPatched === false ? 'source-unpatched' : 'unknown',
          commentsStatus: 'unavailable',
          declaredVerified: row.creator?.isVerified === true,
          riskScore,
          riskLevel: clean(risk?.level, 30),
          obfuscated: risk?.isObfuscated === true
        },
        compatibility: {
          environment: 'client',
          runtime: 'Roblox · ejecutor externo',
          context: 'Publicación externa; el catálogo conserva metadatos y enlace original.',
          requirements: 'Requiere un ejecutor compatible con loadstring y game:HttpGet. La puntuación de riesgo pertenece a RScripts, no es una garantía de seguridad.',
          verification: 'unverified',
          test_details: 'Metadatos públicos consultados el ' + checkedAt.slice(0, 10) + '. RCC no descargó ni ejecutó el código remoto.',
          mobile_status: row.isMobileReady === true ? 'La fuente indica compatibilidad móvil; RCC no lo probó.' : 'PC, Android e iOS sin comprobar.',
          executor_status: 'unverified',
          sources: [source, raw],
          checked_at: checkedAt.slice(0, 10)
        }
      });

      ids.add(id);
      sources.add(source);
      sources.add(raw);
      added++;
    }

    if (page % 10 === 0) {
      console.log('RScripts: ' + pagesChecked + ' páginas; ' + added + '/' + target + ' nuevas entradas.');
    }
    if (payload.meta?.hasNextPage !== true || page >= Number(payload.meta?.totalPages || maxPages)) break;
    await wait(180);
  }

  if (added > 0) writeCatalog(catalog);
  console.log('RScripts: ' + added + ' entradas nuevas; ' + catalog.length + ' entradas totales; ' + pagesChecked + ' páginas consultadas.');
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
