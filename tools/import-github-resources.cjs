// Index public source files from many GitHub projects without copying or executing third-party code.
const crypto = require('node:crypto');
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const API = 'https://api.github.com';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const WAIT = ms => new Promise(resolve => setTimeout(resolve, ms));
const PER_PAGE = 100;
const CONCURRENCY = 4;
const DENIED = /\\b(stealer|keylogger|ransomware|phishing|credential.?theft|cookie.?logger|token.?logger|backdoor|malware|rat)\\b/i;
const SKIP_PATH = /(^|\\/)(node_modules|vendor|dist|build|coverage|\\.git|\\.next|\\.venv|target|bin|obj)(\\/|$)|(^|\\/)\\.github\\//i;
const BAD_FILE = /(^|[._-])(min|bundle|vendor|polyfill|lock|test|spec|mock|fixture|generated)([._-]|$)/i;

const CATEGORIES = [
  {
    key: 'roblox', platform: 'roblox', section: 'games', game: 'Roblox',
    label: 'Roblox / Luau', runtime: 'Luau · Roblox Studio',
    queries: ['topic:roblox topic:luau fork:false archived:false'],
    extensions: ['.lua', '.luau'], maxRepos: 100, maxEntries: 2500,
    allowRepo: /roblox|luau|studio|game.?dev|fusion|module|library/i,
    denyRepo: /\\b(exploit|executor|deobfuscat|decompil|saveinstance|cheat|hack|bypass|stealer)\\b/i
  },
  {
    key: 'fivem', platform: 'fivem', section: 'fivem', game: 'FiveM',
    label: 'FiveM', runtime: 'FiveM / FXServer',
    queries: ['topic:fivem fork:false archived:false', 'topic:qbcore fork:false archived:false', 'topic:esx-framework fork:false archived:false'],
    extensions: ['.lua', '.js', '.mjs', '.cs'], maxRepos: 120, maxEntries: 2500,
    allowRepo: /fivem|fxserver|qbcore|qbox|esx|redm|gta.?v|resource/i,
    denyRepo: /\\b(stealer|backdoor|malware|rat|token.?logger|credential.?theft)\\b/i
  },
  {
    key: 'gameguardian', platform: 'gameguardian', section: 'games', game: 'GameGuardian',
    label: 'GameGuardian · plantillas y aprendizaje', runtime: 'GameGuardian · Lua',
    queries: ['topic:gameguardian language:Lua fork:false archived:false'],
    extensions: ['.lua'], maxRepos: 35, maxEntries: 300,
    allowRepo: /template|example|tutorial|documentation|reference|library|helper|api|sample/i,
    denyRepo: /\\b(cheat|hack|bypass|anti.?ban|offset|mod.?menu|speed.?hack|aimbot|wallhack|stealer|backdoor)\\b/i
  },
  {
    key: 'autotouch', platform: 'autotouch', section: 'all', game: 'AutoTouch',
    label: 'AutoTouch · automatización iOS', runtime: 'AutoTouch · Lua · iOS',
    queries: ['topic:autotouch language:Lua fork:false archived:false', 'autotouch automation language:Lua fork:false archived:false'],
    extensions: ['.lua'], maxRepos: 35, maxEntries: 300,
    allowRepo: /autotouch|auto.?touch|ios|automation|script|example|template/i,
    denyRepo: /\\b(stealer|keylogger|credential.?theft|token.?logger|backdoor|malware)\\b/i
  },
  {
    key: 'web', platform: 'web', section: 'web', game: 'JavaScript / Web',
    label: 'JavaScript / Web', runtime: 'JavaScript · navegador / Node.js',
    queries: ['topic:userscript language:JavaScript fork:false archived:false', 'topic:userscripts language:JavaScript fork:false archived:false', 'topic:javascript-snippets language:JavaScript fork:false archived:false'],
    extensions: ['.js', '.mjs', '.user.js', '.ts'], maxRepos: 120, maxEntries: 2500,
    allowRepo: /userscript|javascript|typescript|browser|web|extension|snippet|frontend|automation/i,
    denyRepo: /\\b(stealer|keylogger|credential.?theft|cookie.?steal|token.?logger|phishing|backdoor|malware|paywall.?bypass)\\b/i
  },
  {
    key: 'java', platform: 'java', section: 'java', game: 'Java · JDK 17+',
    label: 'Java · JDK 17+', runtime: 'Java · JDK 17 o posterior',
    queries: ['language:Java topic:examples fork:false archived:false', 'topic:java-examples language:Java fork:false archived:false'],
    extensions: ['.java'], maxRepos: 120, maxEntries: 2500,
    allowRepo: /java|examples|samples|tutorial|cookbook|learning|guide/i,
    denyRepo: /\\b(stealer|keylogger|credential.?theft|token.?logger|backdoor|malware)\\b/i
  },
  {
    key: 'universal', platform: 'universal', section: 'all', game: 'Universal',
    label: 'Universal', runtime: 'Lua / Python / Shell / PowerShell',
    queries: ['language:Lua topic:lua fork:false archived:false', 'language:Python topic:python-scripts fork:false archived:false', 'language:Shell topic:shell-scripts fork:false archived:false', 'language:PowerShell topic:powershell fork:false archived:false'],
    extensions: ['.lua', '.py', '.sh', '.ps1', '.bat'], maxRepos: 120, maxEntries: 2500,
    allowRepo: /script|automation|utility|tool|example|sample|cli|library|lua|python|shell|powershell/i,
    denyRepo: /\\b(stealer|keylogger|credential.?theft|cookie.?steal|token.?logger|phishing|backdoor|malware|ransomware)\\b/i
  }
];

function clean(value, max = 260) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, max);
}
function categoryText(category, repo) {
  return [repo.full_name, repo.name, repo.description, ...(repo.topics || [])].join(' ');
}
function extensionOf(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.user.js')) return '.user.js';
  return lower.slice(lower.lastIndexOf('.'));
}
function fileAllowed(category, repo, file) {
  if (!file || file.type !== 'blob' || !Number.isSafeInteger(file.size) || file.size < 80 || file.size > 150000) return false;
  if (SKIP_PATH.test(file.path) || BAD_FILE.test(file.path.split('/').pop())) return false;
  const ext = extensionOf(file.path);
  if (!category.extensions.includes(ext)) return false;
  const text = categoryText(category, repo) + ' ' + file.path;
  if (DENIED.test(text) || category.denyRepo.test(text)) return false;
  if (category.allowRepo && !category.allowRepo.test(categoryText(category, repo))) return false;
  if (category.key === 'gameguardian' && !/(template|example|tutorial|documentation|reference|library|helper|api|sample)/i.test(text)) return false;
  if (category.key === 'roblox' && /(^|\\/)(executor|exploit|cheat|deobfuscator|decompiler)(\\/|$)/i.test(file.path)) return false;
  return true;
}
function makeEntry(category, repo, file, checkedAt) {
  const ext = extensionOf(file.path);
  const branch = repo.default_branch || 'main';
  const pathPart = file.path.split('/').map(encodeURIComponent).join('/');
  const sourceUrl = 'https://github.com/' + repo.full_name + '/blob/' + encodeURIComponent(branch) + '/' + pathPart;
  const repoUrl = 'https://github.com/' + repo.full_name;
  const idHash = crypto.createHash('sha1').update(repo.id + ':' + file.path).digest('hex').slice(0, 14);
  const id = 'gh_' + category.key + '_' + idHash;
  const basename = file.path.split('/').pop();
  const language = ext === '.luau' || ext === '.lua' ? (category.key === 'roblox' ? 'Luau' : 'Lua')
    : ext === '.java' ? 'Java' : ext === '.py' ? 'Python'
    : ext === '.ps1' ? 'PowerShell' : ext === '.sh' || ext === '.bat' ? 'Shell'
    : ext === '.cs' ? 'C#' : 'JavaScript';
  const roblox = category.key === 'roblox';
  const tags = roblox
    ? ['RCC', 'Roblox', 'Luau', 'Roblox Studio', 'Código fuente']
    : ['RCC', category.label, language, 'Código fuente externo', 'Repositorio público'];
  for (const topic of (repo.topics || []).slice(0, 3)) {
    const tag = clean(topic, 28);
    if (tag && !tags.includes(tag) && !roblox) tags.push(tag);
  }
  const comment = ['.lua', '.luau'].includes(ext) ? '-- ' : ['.py', '.sh', '.ps1', '.bat'].includes(ext) ? '# ' : '// ';
  const license = repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : 'No indicada en los metadatos';
  const description = roblox
    ? 'Módulo Luau para Roblox Studio. Revisa sus dependencias, permisos y compatibilidad antes de integrarlo en tu propia experiencia.'
    : 'Archivo ' + file.path + ' del proyecto ' + repo.full_name + '. Revisa licencia (' + license + '), dependencias y versión antes de instalarlo.';
  const code = comment + 'RCC: ficha de referencia. Este registro apunta al archivo original; usa «Abrir código original» para consultarlo.';

  return {
    id, name: roblox ? basename : basename + ' · ' + repo.name,
    description, level: 'external', device: 'unknown', platform: category.platform,
    type: 'source', source_only: true, source_url: sourceUrl, file_extension: ext.slice(1),
    executors: [category.runtime], tags: [...new Set(tags)].slice(0, 12),
    version: 'Fuente externa', created_at: checkedAt.slice(0, 10),
    code, game: category.game, game_id: category.key, catalog_section: category.section,
    review: { provider: 'RCC Source Index', source: sourceUrl, checkedAt: checkedAt.slice(0, 10), status: 'unverified', riskAssessment: 'Sin auditoría de ejecución RCC' },
    compatibility: {
      environment: category.key === 'fivem' ? 'server' : 'source',
      runtime: category.runtime,
      context: roblox ? 'Recurso para Roblox Studio y experiencias propias.' : 'Enlace a un archivo de código público; RCC no copia ni ejecuta el contenido.',
      requirements: 'Consulta la página original, su licencia, dependencias, versión y requisitos del entorno.',
      verification: 'source-linked', executor_status: 'not-applicable',
      mobile_status: 'No probado por RCC.', test_details: 'Solo se revisaron metadatos y la ruta del archivo; no se descargó ni ejecutó el código.',
      sources: [sourceUrl, repoUrl], checked_at: checkedAt.slice(0, 10)
    }
  };
}
async function requestJson(url, label) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + TOKEN, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RCC-Community-Indexer/1.0' },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error(label + ' HTTP ' + response.status);
        error.status = response.status;
        if (response.status === 403 || response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get('retry-after'));
          await WAIT(retryAfter > 0 ? Math.min(retryAfter * 1000, 30000) : 1200 * (attempt + 1));
          lastError = error;
          continue;
        }
        throw error;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if ([400, 401, 404].includes(error.status)) throw error;
      if (attempt < 3) await WAIT(500 * (attempt + 1));
    }
  }
  throw lastError || new Error(label + ' no respondió.');
}
async function searchRepos(category) {
  const limit = category.maxRepos;
  const repos = new Map();
  for (const query of category.queries) {
    for (let page = 1; page <= Math.ceil(limit / PER_PAGE) + 1 && repos.size < limit; page++) {
      const url = new URL(API + '/search/repositories');
      url.search = new URLSearchParams({ q: query, sort: 'updated', order: 'desc', per_page: String(PER_PAGE), page: String(page) }).toString();
      let payload;
      try { payload = await requestJson(url, category.label + ' repository search'); }
      catch (error) { console.warn(category.key + ': búsqueda detenida: ' + error.message); break; }
      for (const repo of payload.items || []) {
        if (repos.size >= limit) break;
        if (!repo.full_name || repo.archived || repo.fork || !repo.default_branch) continue;
        if (DENIED.test(categoryText(category, repo)) || category.denyRepo.test(categoryText(category, repo))) continue;
        if (category.allowRepo && !category.allowRepo.test(categoryText(category, repo))) continue;
        if (!repos.has(repo.full_name)) repos.set(repo.full_name, repo);
      }
      if (!payload.items?.length || page * PER_PAGE >= Math.min(Number(payload.total_count || 0), 1000)) break;
      await WAIT(2100);
    }
    if (repos.size >= limit) break;
  }
  return [...repos.values()];
}
async function fetchRepoFiles(category, repo) {
  const url = API + '/repos/' + repo.full_name + '/git/trees/' + encodeURIComponent(repo.default_branch) + '?recursive=1';
  try {
    const payload = await requestJson(url, category.key + ' tree ' + repo.full_name);
    return (payload.tree || []).filter(file => fileAllowed(category, repo, file)).slice(0, Number(process.env.RCC_GITHUB_FILES_PER_REPO || 25));
  } catch (error) {
    console.warn(category.key + ': no se pudo leer ' + repo.full_name + ': ' + error.message);
    return [];
  }
}
async function importCategory(category, existingIds, existingSources, checkedAt) {
  const repos = await searchRepos(category);
  let cursor = 0, added = 0, reviewed = 0;
  const maxEntries = category.maxEntries;
  async function worker() {
    while (cursor < repos.length && added < maxEntries) {
      const repo = repos[cursor++];
      const files = await fetchRepoFiles(category, repo);
      reviewed++;
      for (const file of files) {
        if (added >= maxEntries) break;
        const entry = makeEntry(category, repo, file, checkedAt);
        const source = entry.source_url;
        if (existingIds.has(entry.id) || existingSources.has(source)) continue;
        existingIds.add(entry.id);
        existingSources.add(source);
        catalog.push(entry);
        added++;
      }
      if (reviewed % 25 === 0) console.log(category.key + ': ' + reviewed + '/' + repos.length + ' repositorios, ' + added + ' archivos indexados');
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(category.key + ': ' + added + ' archivos indexados desde ' + reviewed + ' repositorios.');
  return { repos: repos.length, reviewed, added };
}

let catalog;
async function main() {
  if (!TOKEN) throw new Error('Falta GH_TOKEN o GITHUB_TOKEN para buscar repositorios públicos.');
  catalog = readCatalog();
  const existingIds = new Set(catalog.map(item => item.id));
  const existingSources = new Set(catalog.flatMap(item => item.compatibility?.sources || []));
  for (const item of catalog) if (item.source_url) existingSources.add(item.source_url);
  const checkedAt = new Date().toISOString();
  const results = {};
  for (const category of CATEGORIES) results[category.key] = await importCategory(category, existingIds, existingSources, checkedAt);
  const added = Object.values(results).reduce((sum, item) => sum + item.added, 0);
  if (added) writeCatalog(catalog);
  console.log(JSON.stringify({ checkedAt, added, total: catalog.length, results }, null, 2));
}
if (require.main === module) main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
module.exports = { CATEGORIES, fileAllowed, makeEntry };
