// Usage: node tools/check-studio.cjs /tmp/rcc-validation/node_modules
// The journey API is mocked: pending migrations are applied by the deployment platform.
const {chromium}=require(require('node:path').resolve(process.argv[2],'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  let journey={completed:false,state:null};let failJourney=false;
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='localhost')return route.abort();
   if(u.pathname==='/api/journey'){
    if(failJourney)return route.fulfill({status:503,json:{error:'Unavailable'}});
    if(route.request().method()==='POST')journey={...route.request().postDataJSON()};
    return route.fulfill({json:route.request().method()==='POST'?{saved:true}:journey});
   }
   if(u.pathname==='/api/visitors')return route.fulfill({json:{total:42}});
   if(u.pathname==='/api/trends')return route.fulfill({json:{counts:{}}});
   return route.continue();
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8889');
  await page.locator('#welcomeDialog[open]').waitFor();
  await page.locator('#scripts .card').first().waitFor({state:'attached'});
  await page.locator('[data-demo=appearance]').click();assert.match(await page.locator('#tourDemo').textContent(),/siete temas/);
  await page.locator('#tourNext').click();assert(await page.locator('#tourLast').isVisible());
  assert.match(await page.locator('.tour-warning').textContent(),/no es una IA/);
  await page.locator('#tourBack').click();assert(await page.locator('#tourFirst').isVisible());
  await page.screenshot({path:'/tmp/rcc-tour-desktop.png'});
  await page.locator('#tourNext').click();await page.locator('#tourNext').click();
  await page.waitForFunction(()=>!document.getElementById('welcomeDialog').open);
  await page.locator('#libraryAssistant').waitFor();
  await page.locator('#assistantClose').click();assert(journey.completed);
  for(const panel of ['explore','appearance','tools']){
   await page.locator(`[data-panel=${panel}]`).click();assert(await page.locator('#studioPanel').isVisible());
   assert(await page.locator(`#space${panel[0].toUpperCase()+panel.slice(1)}`).isVisible());
   if(panel==='appearance'){
    for(const theme of ['ios','android','hyper','nothing','monochrome','blue','black']){
     await page.locator(`[data-theme=${theme}]`).click();assert.equal(await page.locator('body').getAttribute('data-ui'),theme);
    }
    await page.locator('#motionEnabled').uncheck();
   }
   await page.keyboard.press('Escape');
  }
  await page.locator('#assistantLauncher').click();await page.locator('[data-assist=recommend]').click();assert.equal(await page.locator('#assistantRecommendations button').count(),4);
  await page.locator('#assistantQuery').fill('impossiblezzzznonexistent');await page.locator('#assistantForm button').click();
  await page.locator('.library-notice:not([hidden])').waitFor();assert.match(await page.locator('.library-notice').textContent(),/ni un generador/);
  await page.waitForTimeout(9300);assert(!await page.locator('.library-notice').isVisible());
  await page.locator('#assistantQuery').fill('anotherzzzznonexistent');await page.locator('#assistantForm button').click();
  await page.locator('.library-notice:not([hidden])').waitFor();await page.locator('.library-notice button').click();assert(!await page.locator('.library-notice').isVisible());
  await page.locator('#assistantClose').click();
  await page.locator('#search').fill('Movimiento RCC');
  for(let attempt=0;attempt<24&&journey.state?.query!=='Movimiento RCC';attempt++)await page.waitForTimeout(250);assert.equal(journey.state.query,'Movimiento RCC');
  await page.reload();await page.locator('#scripts .card').first().waitFor({state:'attached'});
  await page.waitForFunction(()=>document.getElementById('search').value==='Movimiento RCC');
  assert(!await page.locator('#welcomeDialog').isVisible());
  await page.locator('#welcomeHelp').click();await page.locator('#tourSkip').click();assert(!await page.locator('#welcomeDialog').isVisible());
  await page.locator('#assistantClose').click();
  await page.locator('#resetFilters').click();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
   await page.locator('[data-panel=explore]').click();
   assert(await page.locator('#typeList').isVisible());
   assert(await page.locator('#studioPanel').evaluate(el=>el.scrollWidth<=el.clientWidth),`panel overflow ${width}`);
   await page.keyboard.press('Escape');
   await page.locator('[data-panel=appearance]').click();
   assert(await page.locator('#studioPanel').evaluate(el=>el.scrollWidth<=el.clientWidth),`appearance overflow ${width}`);
   await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#welcomeHelp').click();await page.screenshot({path:'/tmp/rcc-tour-mobile.png'});await page.locator('#tourSkip').click();await page.locator('#assistantClose').click();
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#bgRccText').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.screenshot({path:'/tmp/rcc-studio-mobile.png',fullPage:true});
  failJourney=true;await page.reload();await page.locator('#welcomeDialog[open]').waitFor();await page.locator('#tourSkip').click();
  await page.waitForFunction(()=>document.getElementById('assistantReply').textContent.includes('No se pudo guardar'));
  assert.deepEqual(errors,[]);
  console.log('Studio OK: two-step tour, skip/reopen, assistant, recommendations, real search, notice, seven themes, API-backed resume, mobile layout, reduced motion and storage failure.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
