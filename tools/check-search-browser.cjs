// Usage: node tools/check-search-browser.cjs /tmp/rcc-validation/node_modules
const {chromium}=require(require('node:path').resolve(process.argv[2],'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
   if(u.pathname==='/api/journey')return route.fulfill({json:{completed:true,state:null,saved:true}});
   if(u.pathname==='/api/visitors')return route.fulfill({json:{total:42}});
   if(u.pathname==='/api/trends')return route.fulfill({json:{counts:{}}});
   return route.continue();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://localhost:8889');await page.locator('#scripts .card').first().waitFor();
  const input=page.locator('#search');
  await input.fill('Delta');await page.waitForFunction(()=>document.getElementById('catalogSearchOptions').parentElement.dataset.query==='Delta');
  assert.equal(await input.getAttribute('aria-expanded'),'true');
  assert.match(await page.locator('#catalogSearchOptions').textContent(),/Delta/);
  await input.press('ArrowDown');assert(await input.getAttribute('aria-activedescendant'));
  await input.press('Enter');assert.equal(await input.inputValue(),'Delta');
  assert.equal(await input.getAttribute('aria-expanded'),'false');
  assert.match(await page.locator('#resultCount').textContent(),/scripts/);
  await input.fill('Dleta');await page.waitForFunction(()=>document.getElementById('catalogSearchOptions').textContent.includes('Quisiste'));
  assert.match(await page.locator('#catalogSearchOptions').textContent(),/Delta/);
  await input.press('Escape');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await input.fill('zxyqnonexistentzzzz');await page.locator('.library-notice:not([hidden])').waitFor();
  assert.match(await page.locator('.library-notice').textContent(),/no es una IA/);
  assert.match(await page.locator('.suggestion-status').first().textContent(),/no una IA/);
  await input.fill('inventario');await page.waitForFunction(()=>document.querySelector('.library-notice').hidden);
  await input.press('Escape');
  await page.locator('#assistantLauncher').click();
  const helper=page.locator('#assistantQuery');await helper.fill('Delta');
  await page.waitForFunction(()=>document.getElementById('helperSearchOptions').parentElement.dataset.query==='Delta');
  await helper.press('ArrowDown');await helper.press('Enter');
  assert.match(await page.locator('#assistantReply').textContent(),/Buscando/);
  await helper.fill('recomiéndame para Delta');await helper.press('Escape');await page.locator('#assistantForm button').click();
  assert((await page.locator('#assistantRecommendations button').count())>0);
  assert.match(await page.locator('#assistantReply').textContent(),/Delta/);
  await helper.fill('zxyqnonexistentzzzz');await helper.press('Escape');await page.locator('#assistantForm button').click();
  assert.match(await page.locator('#assistantReply').textContent(),/ni un generador/);
  await page.locator('#assistantClose').click();await page.locator('#resetFilters').click();
  const names=await page.locator('#cinemaSelect option').allTextContents();assert(names.includes('Delta'));assert(names.includes('Solara'));
  assert.equal(names.length,await page.evaluate(()=>window.RCCNavigation.executors().length));
  for(const name of names){await page.locator('#cinemaSelect').selectOption(name);assert.equal(await page.locator('#cinemaExecutor').textContent(),name);}
  assert(!await page.locator('.executor-cinema').evaluate(el=>el.classList.contains('cinema-paused')));
  await page.locator('#cinemaPause').click();assert.equal(await page.locator('#cinemaPause').getAttribute('aria-pressed'),'true');
  await page.locator('#cinemaPause').click();assert.equal(await page.locator('#cinemaPause').getAttribute('aria-pressed'),'false');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.cinema-game-player').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.waitForFunction(()=>document.getElementById('cinemaPause').disabled);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await input.fill('Blox');
  await page.waitForFunction(()=>document.getElementById('catalogSearchOptions').parentElement.dataset.query==='Blox');await page.waitForTimeout(300);
  await page.screenshot({path:'/tmp/rcc-search-desktop.png'});
  for(const width of [390,768]){
   await page.setViewportSize({width,height:844});await input.focus();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
   assert(await page.locator('.search-suggestions').first().evaluate(el=>el.getBoundingClientRect().right<=innerWidth));
   await input.press('Escape');
  }
  await page.locator('#assistantLauncher').click();await helper.fill('Delta');
  await page.waitForFunction(()=>document.getElementById('helperSearchOptions').parentElement.dataset.query==='Delta');
  assert(await page.locator('#libraryAssistant').evaluate(el=>el.scrollWidth<=el.clientWidth));
  await page.locator('#assistantClose').click();await page.setViewportSize({width:390,height:844});
  await input.fill('Delta');await page.waitForFunction(()=>document.getElementById('catalogSearchOptions').parentElement.dataset.query==='Delta');
  await page.screenshot({path:'/tmp/rcc-search-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log('Search UI OK: keyboard autocomplete, corrections, unknown-query notice, assistant suggestions/recommendations, all executor clips, pause, reduced motion, and mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
