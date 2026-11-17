// Import new public ScriptBlox metadata only. RCC never downloads or executes remote source code.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const DENIED = /steal|token.?log|cookie.?log|account.?hack|beam|phish|grabber|dupe.?robux|free.?robux|password.?steal/i;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const dateOnly = value => {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
};
const clean = (value, max = 180) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

async function getJson(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'RCC-Catalog/1.0 (public metadata index)' },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error('ScriptBlox HTTP ' + response.status);
        error.status = response.status;
        const retryAfter = Number(response.headers.get('retry-after'));
        if (response.status === 429 || response.status >= 500) {
          await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 15000) : 700 * (attempt + 1));
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
  throw lastError || new Error('ScriptBlox no respondió.');
}

function safeImage(value) {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const url = value.startsWith('/') ? new URL(value, 'https://scriptblox.com') : new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !(host === 'scriptblox.com' || host.endsWith('.rbxcdn.com'))) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

async function main() {
  const target = Number(process.argv[2] || process.env.RCC_SCRIPTBLOX_TARGET || 1500);
  const maxPages = Number(process.env.RCC_SCRIPTBLOX_MAX_PAGES || 900);
  if (!Number.isSafeInteger(target) || target < 1 || target > 5000) {
    throw new Error('Target ScriptBlox debe estar entre 1 y 5000.');
  }

  const catalog = readCatalog();
  const ids = new Set(catalog.map(item => item.id));
  const sources = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  const rawFromCode = new Set(catalog.map(item => item.code?.match(/https:\/\/(?:scriptblox\.com|rscripts\.net)\/raw\/[^\s"')]+/i)?.[0]).filter(Boolean));
  for (const source of rawFromCode) sources.add(source);

  const checkedAt = new Date().toISOString();
  let added = 0;
  let pagesChecked = 0;

  for (let page = 1; page <= maxPages && added < target; page++) {
    const url = new URL('https://scriptblox.com/api/script/fetch');
    url.search = new URLSearchParams({
      page: String(page),
      max: '20',
      mode: 'free',
      patched: '0',
      sortBy: 'createdAt',
      order: 'desc'
    }).toString();

    let payload;
    try {
      payload = await getJson(url);
    } catch (error) {
      console.warn('Importación ScriptBlox detenida en página ' + page + ': ' + error.message);
      break;
    }

    const result = payload?.result;
    if (!Array.isArray(result?.scripts)) {
      throw new Error('ScriptBlox devolvió una respuesta sin result.scripts.');
    }
    pagesChecked++;

    for (const item of result.scripts) {
      if (added >= target) break;
      const scriptId = String(item?._id || '');
      const slug = String(item?.slug || '');
      const title = clean(item?.title, 180);
      if (!/^[a-f0-9]{24}$/i.test(scriptId)) continue;
      if (!/^[a-z0-9][a-z0-9._%()-]{0,180}$/i.test(slug)) continue;
      if (!title || DENIED.test(title) || item.isPatched === true || item.scriptType !== 'free') continue;

      const gameName = clean(item.game?.name || (item.isUniversal ? 'Universal Script' : ''), 180);
      if (!gameName) continue;

      const id = 'games_sb_' + scriptId;
      const source = 'https://scriptblox.com/script/' + encodeURIComponent(slug);
      const raw = 'https://scriptblox.com/raw/' + encodeURIComponent(slug);
      if (ids.has(id) || sources.has(source) || sources.has(raw)) continue;

      const image = safeImage(item.game?.imageUrl || item.image);
      const createdAt = dateOnly(item.createdAt);
      const isKeyed = item.key === true;
      const universal = item.isUniversal === true;
      const tags = ['Juegos', 'Comunidad', 'ScriptBlox', isKeyed ? 'Con clave' : 'Sin clave'];
      if (universal) tags.push('Universal');
      if (item.verified === true) tags.push('Fuente declara verificado');

      catalog.push({
        id,
        ...(image ? { reference_image: image } : {}),
        name: title,
        description: clean(item.features || item.description || (gameName + '. Publicación gratuita de la comunidad.'), 300)
          + ' Fuente externa; RCC no ha descargado ni ejecutado este código.',
        level: 'free',
        device: 'unknown',
        platform: 'roblox',
        type: 'loadstring',
        executors: ['Ejecutor externo (sin verificar)'],
        tags,
        version: clean(item.version || 'Sin versión publicada', 60),
        created_at: createdAt,
        code: '-- RCC: loader externo no verificado. Lee la ficha y el código original antes de usarlo.\n'
          + '-- Fuente: ' + source + '\n'
          + 'loadstring(game:HttpGet(' + JSON.stringify(raw) + '))()',
        game: gameName,
        game_id: String(item.game?.gameId || item.game?.placeId || '0'),
        catalog_section: 'games',
        review: {
          provider: 'ScriptBlox',
          source,
          checkedAt: checkedAt,
          status: item.isPatched === true ? 'patched' : item.isPatched === false ? 'source-unpatched' : 'unknown',
          commentsStatus: 'unavailable',
          declaredVerified: item.verified === true,
          riskAssessment: 'No evaluado por RCC'
        },
        compatibility: {
          environment: 'client',
          runtime: 'Roblox · ejecutor externo',
          context: 'Publicación pública de ScriptBlox; el catálogo conserva sus metadatos y el enlace original.',
          requirements: 'Requiere un ejecutor compatible con loadstring y game:HttpGet. Revisa la publicación y el contenido remoto antes de ejecutarlo.',
          verification: 'unverified',
          test_details: 'Metadatos consultados el ' + checkedAt.slice(0, 10) + '. RCC no descargó ni ejecutó el código remoto.',
          mobile_status: 'PC, Android e iOS sin comprobar.',
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

    if (page % 20 === 0) {
      console.log('ScriptBlox: ' + pagesChecked + ' páginas; ' + added + '/' + target + ' nuevas entradas.');
    }
    const nextPage = Number(result.nextPage);
    if (!result.nextPage || page >= Number(result.totalPages || maxPages)) break;
    if (Number.isInteger(nextPage) && nextPage > page) page = nextPage - 1;
    await wait(140);
  }

  if (added > 0) writeCatalog(catalog);
  console.log('ScriptBlox: ' + added + ' entradas nuevas; ' + catalog.length + ' entradas totales; ' + pagesChecked + ' páginas consultadas.');
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
