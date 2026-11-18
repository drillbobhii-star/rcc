// Broad, license-aware public-source importer for RCC's non-marketplace catalogs.
// Only permissively licensed, text-based scripts are copied. External code is never executed.
// Provenance is retained in review/compatibility metadata even when a card does not display its origin.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const ALLOWED_LICENSES = new Set(['mit','bsd-2-clause','bsd-3-clause','isc']);
const DENIED = /password.?steal|cookie.?steal|token.?steal|credential.?steal|keylogger|ransomware|cryptominer|wallet.?steal|phishing|rat\b|backdoor|exfiltrat|grabber|stealer|discord(webhook|\.com\/api\/webhooks).*?(token|cookie|password)/i;
const OBFUSCATED = /eval\s*\(\s*atob|fromCharCode\s*\([^)]{80,}|\\x[0-9a-f]{2}.{0,20}\\x[0-9a-f]{2}.{0,20}\\x[0-9a-f]{2}/i;
const MAX_SOURCE_BYTES = 48 * 1024;
const MAX_FILES_PER_REPO = 8;
const WAIT = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = (v,n=240) => String(v ?? '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,n);

const PLATFORMS = {
  roblox: {
    queries:['topic:roblox language:Luau license:mit','topic:roblox language:Lua license:mit'],
    extensions:['.lua','.luau'],
    section:'games', label:'Roblox', runtime:'Luau / Roblox Studio',
    path:/(\.lua|\.luau)$/i, include:/script|module|server|client|studio|system|component|service|controller/i,
    exclude:/test|spec|benchmark|vendor|node_modules|\.github/i,
  },
  fivem: {
    queries:['topic:fivem language:Lua license:mit','topic:fivem language:JavaScript license:mit'],
    extensions:['.lua','.js'],
    section:'fivem', label:'FiveM', runtime:'FiveM / FXServer',
    path:/\.(lua|js)$/i, include:/client|server|shared|resource|script|fxmanifest/i,
    exclude:/test|spec|vendor|node_modules|dist|\.github/i,
  },
  gameguardian: {
    queries:['topic:gameguardian language:Lua license:mit','topic:game-guardian language:Lua license:mit'],
    extensions:['.lua'],
    section:'games', label:'GameGuardian', runtime:'GameGuardian · Lua / Android',
    path:/\.lua$/i, include:/game.?guardian|gg|script|memory|search|offset/i,
    exclude:/test|spec|vendor|node_modules|\.github/i,
  },
  autotouch: {
    queries:['topic:autotouch language:Lua license:mit','autotouch lua scripts license:mit'],
    extensions:['.lua'],
    section:'games', label:'AutoTouch', runtime:'AutoTouch · Lua / iOS',
    path:/\.lua$/i, include:/autotouch|script|automation|touch|tap|image|ocr/i,
    exclude:/test|spec|vendor|node_modules|\.github/i,
  },
  web: {
    queries:['topic:javascript language:JavaScript license:mit','topic:web-development language:JavaScript license:mit'],
    extensions:['.js','.mjs','.html','.ts'],
    section:'web', label:'JavaScript / Web', runtime:'Browser · JavaScript / HTML',
    path:/\.(js|mjs|html|ts)$/i, include:/script|example|component|widget|web|browser|app|demo/i,
    exclude:/test|spec|vendor|node_modules|dist|build|\.min\.|\.d\.ts|\.github/i,
  },
  java: {
    queries:['language:Java license:mit topic:java','language:Java license:bsd-3-clause'],
    extensions:['.java'],
    section:'java', label:'Java · JDK 17+', runtime:'Java · JDK 17+',
    path:/\.java$/i, include:/src|main|example|demo|algorithm|util|service|app/i,
    exclude:/test|spec|target|build|generated|vendor|\.github/i,
  },
  universal: {
    queries:['topic:lua language:Lua license:mit','topic:python language:Python license:mit'],
    extensions:['.lua','.py'],
    section:null, label:'Universal', runtime:'Lua / Python · depende del proyecto',
    path:/\.(lua|py)$/i, include:/script|example|automation|tool|utility|demo|sample/i,
    exclude:/test|spec|vendor|node_modules|dist|build|\.github/i,
  }
};

function headers(token) {
  return { Accept:'application/vnd.github+json', Authorization:'Bearer '+token, 'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'RCC-Catalog-Importer' };
}
async function getJson(url, token) {
  for(let attempt=0;attempt<5;attempt++) {
    const response=await fetch(url,{headers:headers(token),signal:AbortSignal.timeout(25000)});
    if(response.ok)return response.json();
    if(response.status===403 && Number(response.headers.get('x-ratelimit-remaining'))===0) {
      const reset=Number(response.headers.get('x-ratelimit-reset'))*1000;
      await WAIT(Math.max(1000,Math.min(60000,reset-Date.now()+1000)));continue;
    }
    if(response.status===429||response.status>=500){await WAIT(1000*(attempt+1));continue;}
    throw new Error('GitHub API '+response.status+' en '+url);
  }
  throw new Error('GitHub API agotó reintentos: '+url);
}
async function getText(url) {
  const response=await fetch(url,{headers:{Accept:'text/plain'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const text=await response.text();
  if(Buffer.byteLength(text)>MAX_SOURCE_BYTES)throw new Error('Archivo demasiado grande');
  return text;
}
function safeCode(text) {
  if(typeof text!=='string'||text.length<80||DENIED.test(text)||OBFUSCATED.test(text))return false;
  const lines=text.split(/\r?\n/);
  if(lines.length<5||lines.length>1600)return false;
  if((text.match(/[^\x00-\x7F]/g)||[]).length>text.length*0.25)return false;
  if(/-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[0-9A-Z]{16}/.test(text))return false;
  return true;
}
function classifyFile(platform,path) {
  const p=PLATFORMS[platform];
  if(!p.path.test(path)||p.exclude.test(path))return false;
  return p.include.test(path)||path.split('/').length<=3;
}
function makeEntry(platform,repo,file,code,checkedAt) {
  const p=PLATFORMS[platform],license=repo.license?.spdx_id?.toLowerCase();
  const source=repo.html_url+'/blob/'+encodeURIComponent(repo.default_branch)+'/'+file.path.split('/').map(encodeURIComponent).join('/');
  const raw=RAW+'/'+repo.full_name+'/'+encodeURIComponent(repo.default_branch)+'/'+file.path.split('/').map(encodeURIComponent).join('/');
  const ext=file.path.split('.').pop().toLowerCase();
  const base=file.path.split('/').pop().replace(/\.[^.]+$/,'');
  const name=clean(base.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),120);
  const id='gh_'+platform+'_'+repo.id+'_'+file.sha.slice(0,12);
  const attribution='Original: '+repo.full_name+' · '+license.toUpperCase()+' · '+repo.owner.login;
  const codeHeader=ext==='lua'||ext==='luau'?'-- ':'// ';
  const tagged=['RCC','Open Source',p.label,ext.toUpperCase(),license.toUpperCase()];
  if(repo.topics?.length)tagged.push(...repo.topics.slice(0,3).map(x=>clean(x,32)));
  return {
    id,name:clean(name+' · '+p.label,180),
    description:clean(repo.description||('Código público '+p.label+'.'),260)+' Licencia '+license.toUpperCase()+'. Revisa requisitos y versión antes de utilizarlo.',
    level:'free',device:platform==='autotouch'||platform==='gameguardian'?'mobile':platform==='fivem'||platform==='java'?'pc':'both',
    platform:platform==='roblox'?'roblox':platform==='web'?'web':platform,
    type:'source',executors:[p.runtime],tags:[...new Set(tagged)].slice(0,14),
    version:'Repositorio público · '+(repo.pushed_at||'sin fecha').slice(0,10),
    created_at:(repo.created_at||checkedAt).slice(0,10),
    code:codeHeader+'RCC · '+p.label+' · '+attribution+'\n'+code,
    ...(p.section?{catalog_section:p.section}:{}),
    source_only:false,
    review:{provider:'GitHub',source,checkedAt:checkedAt.slice(0,10),sourceUpdatedAt:repo.pushed_at||repo.updated_at||checkedAt,importedAt:checkedAt,status:'license-checked',license:license.toUpperCase(),repository:repo.full_name,stars:repo.stargazers_count||0,riskAssessment:'Filtro estático básico; no equivale a auditoría de seguridad.'},
    compatibility:{
      environment:platform==='fivem'?'server':platform==='web'?'browser':platform==='java'?'jvm':platform==='roblox'?'studio':platform,
      runtime:p.runtime,context:'Archivo público seleccionado de un repositorio con licencia permisiva declarada.',
      requirements:'Comprueba la licencia, las dependencias, el runtime y la versión del proyecto original. RCC no ejecuta el archivo.',
      verification:'source-reviewed',test_details:'Revisión de metadatos, extensión, tamaño, licencia y filtros estáticos. No ejecutado por RCC.',
      mobile_status:platform==='autotouch'?'Requiere AutoTouch en iOS; prueba física no realizada.':'Compatibilidad de dispositivo no comprobada.',
      executor_status:'not-applicable',sources:[source,raw],checked_at:checkedAt.slice(0,10)
    }
  };
}
async function searchRepos(query,page,token) {
  const url=new URL(API+'/search/repositories');
  url.search=new URLSearchParams({q:query,per_page:'100',page:String(page),sort:'updated',order:'desc'}).toString();
  const data=await getJson(url,token);
  return Array.isArray(data.items)?data.items:[];
}
async function processPlatform(platform,target,token,catalog,ids,sources,stats) {
  const p=PLATFORMS[platform],seenRepos=new Set(),checkedAt=new Date().toISOString();
  for(const query of p.queries) {
    for(let page=1;page<=3&&stats.added<target;page++) {
      let repos;
      try{repos=await searchRepos(query,page,token);}catch(error){console.warn(platform+' search: '+error.message);break;}
      if(!repos.length)break;
      for(const repo of repos) {
        if(stats.added>=target)break;
        if(seenRepos.has(repo.full_name)||repo.fork||repo.archived||repo.disabled||!repo.default_branch)continue;
        seenRepos.add(repo.full_name);
        const license=repo.license?.spdxId?.toLowerCase();
        if(!ALLOWED_LICENSES.has(license))continue;
        let tree;
        try{const url=API+'/repos/'+repo.full_name+'/git/trees/'+encodeURIComponent(repo.default_branch)+'?recursive=1';tree=await getJson(url,token);}
        catch{continue;}
        if(tree.truncated||!Array.isArray(tree.tree))continue;
        const files=tree.tree.filter(file=>file.type==='blob'&&file.size>=80&&file.size<=MAX_SOURCE_BYTES&&classifyFile(platform,file.path))
          .sort((a,b)=>a.path.length-b.path.length).slice(0,MAX_FILES_PER_REPO);
        for(const file of files) {
          if(stats.added>=target)break;
          const id='gh_'+platform+'_'+repo.id+'_'+file.sha.slice(0,12);
          const source=repo.html_url+'/blob/'+repo.default_branch+'/'+file.path;
          if(ids.has(id)||sources.has(source))continue;
          const raw=RAW+'/'+repo.full_name+'/'+repo.default_branch+'/'+file.path.split('/').map(encodeURIComponent).join('/');
          let code;try{code=await getText(raw);}catch{continue;}
          if(!safeCode(code))continue;
          const entry=makeEntry(platform,repo,file,code,checkedAt);
          catalog.push(entry);ids.add(id);sources.add(source);stats.added++;
        }
        stats.repos++;
        if(stats.repos%25===0)console.log(platform+': '+stats.repos+' repos; '+stats.added+'/'+target+' scripts.');
      }
      if(repos.length<100)break;
    }
  }
  stats.seenRepos=seenRepos.size;
}
async function main() {
  const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
  if(!token)throw new Error('Configura GH_TOKEN (GitHub Actions puede usar github.token).');
  const selected=(process.argv[2]||'all').split(',').map(x=>x.trim().toLowerCase()).filter(x=>x==='all'||PLATFORMS[x]);
  const target=Number(process.argv[3]||process.env.RCC_GITHUB_SCRIPTS_PER_PLATFORM||1500);
  if(!Number.isSafeInteger(target)||target<1||target>3000)throw new Error('Target por catálogo: 1–3000.');
  const platforms=selected.includes('all')?Object.keys(PLATFORMS):selected;
  const catalog=readCatalog(),ids=new Set(catalog.map(x=>x.id)),sources=new Set(catalog.flatMap(x=>x.compatibility?.sources||[]));
  const report={startedAt:new Date().toISOString(),before:catalog.length,platforms:{},note:'GitHub public repos; only MIT/BSD/ISC; RCC static filters; no execution.'};
  for(const platform of platforms) {
    const stats={added:0,repos:0,seenRepos:0};
    await processPlatform(platform,target,token,catalog,ids,sources,stats);
    report.platforms[platform]=stats;
  }
  if(catalog.length!==report.before)writeCatalog(catalog);
  report.after=catalog.length;report.added=report.after-report.before;report.finishedAt=new Date().toISOString();
  require('node:fs').writeFileSync('assets/catalog-github-import-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
