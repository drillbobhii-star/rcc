// Import public listing metadata only. Never fetch, evaluate, or execute third-party code.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const denied = /steal|token.?log|cookie.?log|account.?hack|beam|phish|grabber|dupe.?robux|free.?robux|password.?steal|key.?logger|credential|session.?steal|webhook.?steal|malware|ransom|backdoor|rat\\b|bypass.?anti.?cheat/i;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const dateStamp = value => {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
};
const cleanText = (value, max = 500) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, max);
function allowedUrl(value, host, prefix) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && url.pathname.startsWith(prefix) ? url.toString() : null;
  } catch { return null; }
}

async function main() {
  const catalog = readCatalog();
  const ids = new Set(catalog.map(item => item.id));
  const sources = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  const target = Number(process.argv[2] || 1200);
  if (!Number.isSafeInteger(target) || target < 1 || target > 2000) {
    throw new Error('Target must be between 1 and 2000');
  }

  let addedScriptBlox = 0;
  let addedRscripts = 0;
  const addEntry = entry => {
    if (ids.has(entry.id) || sources.has(entry.source)) return false;
    if (!entry.title || denied.test(entry.title) || !entry.rawUrl) return false;
    catalog.push({
      id: entry.id,
      name: cleanText(entry.title, 180),
      description: cleanText(entry.description, 600) || `${entry.gameName}. Publicación externa de la comunidad. Contenido remoto y funcionamiento sin verificar por RCC.`,
      level: 'free',
      device: entry.device || 'unknown',
      platform: 'roblox',
      type: 'loadstring',
      executors: entry.executors?.length ? entry.executors : ['Ejecutor externo (sin verificar)'],
      tags: ['Juegos', 'Comunidad', entry.sourceName, entry.keyRequired ? 'Con clave' : 'Sin clave indicada'],
      version: '1.0',
      created_at: dateStamp(entry.createdAt),
      reference_image: entry.imageUrl || undefined,
      code: `loadstring(game:HttpGet(${JSON.stringify(entry.rawUrl)}))()`,
      game: cleanText(entry.gameName || 'Roblox', 180),
      game_id: String(entry.gameId || 0),
      catalog_section: 'games',
      compatibility: {
        environment: 'client',
        runtime: 'Roblox · ejecutor externo',
        context: 'Publicación externa de la comunidad. Revisa la fuente antes de copiar o ejecutar el código.',
        requirements: 'El contenido remoto puede cambiar. No ejecutar sin revisar la publicación original.',
        verification: 'unverified',
        test_details: entry.testDetails || 'RCC solo incorporó metadatos y enlaces públicos. No descargó, auditó ni ejecutó el código remoto.',
        mobile_status: entry.device === 'mobile' ? 'La fuente declara compatibilidad móvil; no verificada por RCC.' : 'PC, Android e iOS sin comprobar por RCC.',
        executor_status: 'unverified',
        sources: [entry.source],
        checked_at: new Date().toISOString().slice(0, 10),
        ...(entry.risk ? { source_risk_score: entry.risk.score, source_risk_level: entry.risk.level, source_obfuscated: entry.risk.isObfuscated === true } : {})
      }
    });
    ids.add(entry.id);
    sources.add(entry.source);
    return true;
  };

  async function importScriptBlox(limit) {
    let added = 0;
    for (let page = 1; page <= 900 && added < limit; page++) {
      const params = new URLSearchParams({ page: String(page), max: '20', mode: 'free', patched: '0', sortBy: 'createdAt', order: 'desc' });
      const response = await fetch(`https://scriptblox.com/api/script/fetch?${params}`, { signal: AbortSignal.timeout(25000) });
      if (!response.ok) {
        console.warn(`ScriptBlox stopped at page ${page}: HTTP ${response.status}`);
        break;
      }
      const payload = await response.json();
      const result = payload?.result;
      if (!Array.isArray(result?.scripts)) throw new Error('ScriptBlox returned an unexpected listing');
      for (const item of result.scripts) {
        if (!/^[a-f0-9]{24}$/.test(String(item?._id || '')) || typeof item.slug !== 'string' || !/^[\\w().%-]+$/.test(item.slug)) continue;
        if (item.isPatched !== false || item.scriptType !== 'free') continue;
        const game = item.game || {};
        const gameName = typeof game.name === 'string' ? game.name : (item.isUniversal ? 'Universal' : '');
        const rawUrl = allowedUrl('https://scriptblox.com/raw/' + item.slug, 'scriptblox.com', '/raw/');
        const source = 'https://scriptblox.com/script/' + item.slug;
        if (!gameName || !rawUrl) continue;
        const ok = addEntry({
          id: `games_sb_${item._id}`, source, title: item.title,
          description: `${gameName}. ${item.title}. ${item.key ? 'Requiere clave.' : 'Sin clave indicada.'} Ficha externa, no verificada por RCC.`,
          gameName, gameId: game.gameId || 0, rawUrl,
          imageUrl: typeof game.imageUrl === 'string' && /^\\/images\\/[\\w/.-]+$/.test(game.imageUrl) ? 'https://scriptblox.com' + game.imageUrl : null,
          keyRequired: item.key === true, createdAt: item.createdAt,
          sourceName: 'ScriptBlox', device: 'unknown',
          testDetails: `Publicación declarada gratuita y no parcheada por ScriptBlox. Revisada en listado el ${new Date().toISOString().slice(0, 10)}; RCC no descargó ni ejecutó el código.`
        });
        if (ok) added++;
        if (added >= limit) break;
      }
      if (!result.nextPage || page >= Number(result.totalPages || page)) break;
      await pause(120);
    }
    return added;
  }

  async function importRscripts(limit) {
    const key = process.env.RSCRIPTS_API_KEY;
    if (!key || limit <= 0) return 0;
    let added = 0;
    for (let page = 1; page <= 200 && added < limit; page++) {
      const params = new URLSearchParams({ page: String(page), limit: '48', sort: 'newest', freeOnly: 'true', htmlDescription: 'false', includeScript: 'false' });
      const response = await fetch('https://api.rscripts.net/v1/scripts?' + params, {
        headers: { Authorization: 'Bearer ' + key },
        signal: AbortSignal.timeout(25000)
      });
      if (!response.ok) {
        console.warn(`Rscripts stopped at page ${page}: HTTP ${response.status}`);
        break;
      }
      const payload = await response.json();
      if (payload?.success !== true || !Array.isArray(payload.data)) throw new Error('Rscripts returned an unexpected listing');
      for (const item of payload.data) {
        if (!/^[a-f0-9]{24}$/.test(String(item?.id || '')) || typeof item.slug !== 'string') continue;
        if (item.isPaid === true || item.isPatched !== false) continue;
        const score = Number(item.risk?.score);
        const riskLevel = String(item.risk?.level || '').toLowerCase();
        if (!Number.isFinite(score) || score > 3 || !['safe', 'low risk'].includes(riskLevel)) continue;
        const rawUrl = allowedUrl(item.rawScript, 'rscripts.net', '/raw/');
        const source = 'https://rscripts.net/script/' + encodeURIComponent(item.slug);
        if (!rawUrl) continue;
        const game = item.game || {};
        const gameName = typeof game.title === 'string' ? game.title : 'Roblox';
        const executors = Array.isArray(item.executors) ? item.executors.map(executor => cleanText(executor?.name, 80)).filter(Boolean) : [];
        const ok = addEntry({
          id: `games_rs_${item.id}`, source, title: item.title,
          description: cleanText(item.description, 500) || `${gameName}. Publicación gratuita de Rscripts.`,
          gameName, gameId: game.placeId || 0, rawUrl,
          imageUrl: allowedUrl(game.thumbnailUrl, 'rscripts.net', '/assets/') || null,
          keyRequired: item.isKeySystem === true, createdAt: item.createdAt,
          sourceName: 'Rscripts', device: item.isMobileReady === true ? 'mobile' : 'unknown', executors,
          risk: { score, level: item.risk.level, isObfuscated: item.risk.isObfuscated === true },
          testDetails: `Rscripts indica riesgo ${item.risk.level} (${score}/10). RCC importó metadatos únicamente; no descargó, auditó ni ejecutó el código.`
        });
        if (ok) added++;
        if (added >= limit) break;
      }
      if (!payload.meta?.hasNextPage || payload.data.length < 48) break;
      await pause(160);
    }
    return added;
  }

  const rscriptsEnabled = Boolean(process.env.RSCRIPTS_API_KEY);
  const scriptBloxLimit = rscriptsEnabled ? Math.ceil(target * 0.6) : target;
  addedScriptBlox = await importScriptBlox(scriptBloxLimit);
  if (rscriptsEnabled && addedScriptBlox < target) {
    try {
      addedRscripts = await importRscripts(target - addedScriptBlox);
    } catch (error) {
      console.warn('Rscripts import skipped; keeping ScriptBlox entries:', error.message);
    }
  } else if (!rscriptsEnabled) {
    console.log('RSCRIPTS_API_KEY not configured; importing from ScriptBlox only.');
  }

  writeCatalog(catalog);
  console.log(`Imported ${addedScriptBlox + addedRscripts} unique entries (ScriptBlox: ${addedScriptBlox}; Rscripts: ${addedRscripts}); catalog: ${catalog.length}`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
