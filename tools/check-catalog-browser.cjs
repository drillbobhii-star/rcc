// Browser regression checks use local files and mocked API responses; no external scripts run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve(process.argv[2]||'/tmp/rcc-validation/node_modules','playwright'));
const catalog=JSON.parse(fs.readFileSync('scripts.json'));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try {
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
 let mode='ready',copies=0;
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname!=='localhost')return route.abort();
  if(url.pathname==='/api/trending'){
   if(route.request().method()==='POST'){copies++;return route.fulfill({json:{ok:true}});}
   if(mode==='error')return route.fulfill({status:503,json:{error:'Unavailable'}});
   return route.fulfill({json:{items:mode==='empty'?[]:[{id:catalog[0].id,copies:copies+3}],days:7}});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{total:0}});
  const file=path.resolve('.',url.pathname==='/'?'index.html':url.pathname.slice(1));
  if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({path:file,contentType:type});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8889');
 await page.evaluate(()=>localStorage.setItem('rcc_welcome_seen','true'));
 const welcome=page.getByRole('button',{name:'Entendido, ir a buscar scripts',exact:true});if(await welcome.isVisible())await welcome.click();
 await page.waitForFunction(total=>document.getElementById('statTotal').textContent===String(total),catalog.length);
 assert.equal(await page.locator('#scripts .card').count(),36);
 assert.equal(await page.locator('.visitor-badge,.mobile-visitors').count(),0);
 await page.waitForSelector('.trending-card');await page.locator('.trending-card').first().click();await page.locator('[onclick="copyCode()"]').click();
 await page.waitForFunction(()=>document.getElementById('trendingList').textContent.includes('4 copias'));
 assert.equal(copies,1);await page.locator('#modal .close').click();
 // A platform shortcut must not silently select an unrelated tag.
 await page.locator('[data-platform-shortcut="fivem"]').click();
 assert.equal(await page.locator('#tagFilter').inputValue(),'');assert((await page.locator('#scripts .card').count())>0);
 // A section change clears filters; selecting a platform leaves the games section.
 await page.locator('#gamesTab').click();await page.locator('#platformList .nav-item').filter({hasText:'FiveM'}).click();
 assert.equal(await page.locator('#libraryTab').getAttribute('aria-pressed'),'true');assert((await page.locator('#scripts .card').count())>0);
 await page.locator('#resetFilters').click();await page.locator('#environmentFilter').selectOption('server');
 assert((await page.locator('#activeFilters').textContent()).includes('Entorno:'));
 await page.locator('#activeFilters .chip').filter({hasText:'Entorno:'}).locator('button').click();assert.equal(await page.locator('#environmentFilter').inputValue(),'all');
 await page.locator('#search').fill('zzzznoexistezzzz');await page.locator('#emptyReset').click();assert.equal(await page.locator('#search').inputValue(),'');assert.equal(await page.locator('#scripts .card').count(),36);
 // Third-party provenance stays hidden while the actual loader stays intact.
 const external=catalog.find(s=>s.catalog_section==='games'&&s.type==='loadstring');
 await page.evaluate(id=>{location.hash=new URLSearchParams({script:id}).toString()},external.id);
 await page.waitForFunction(code=>document.getElementById('modalCode')?.textContent===code,external.code);
 assert(!(await page.locator('#modalBody').textContent()).includes('ScriptBlox'));
 assert.equal(await page.locator('#compatDetail a[href*="scriptblox"]').count(),0);
 await page.locator('#modal .close').click();
 mode='empty';await page.evaluate(()=>loadTrending());assert((await page.locator('#trendingList').textContent()).includes('inaugurar'));
 mode='error';await page.evaluate(()=>loadTrending());await page.locator('#trendingList button').waitFor();mode='ready';await page.locator('#trendingList button').click();await page.waitForSelector('.trending-card');
 await page.setViewportSize({width:390,height:844});assert(await page.locator('#trendingTitle').isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('Browser OK: desktop/mobile, copy ranking, empty/error/retry states, platform and section transitions, visible filters, reset, source hiding, preserved loaders.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
