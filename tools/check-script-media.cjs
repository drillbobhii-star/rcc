// Usage: node tools/check-script-media.cjs /tmp/rcc-validation/node_modules
const {chromium}=require(require('node:path').resolve(process.argv[2],'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  let mode='found',requests=0;
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
   if(u.pathname==='/api/journey')return route.fulfill({json:{completed:true,state:null,saved:true}});
   if(u.pathname==='/api/visitors')return route.fulfill({json:{total:42}});
   if(u.pathname==='/api/script-video'){
    requests++;
    if(mode==='error')return route.fulfill({status:502,json:{error:'Unavailable'}});
    return route.fulfill({json:{videos:mode==='empty'?[]:[{id:'gAzDfuaaPe8',title:'AtherHub Blox Fruits example',channel:'Reference channel'}]}});
   }
   return route.continue();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8889');await page.locator('#scripts .card').first().waitFor();
  assert(await page.locator('#scripts .card .game-cover').count()>0);
  assert(await page.locator('#scripts .card .script-art').count()>0);
  const fixture={id:'test',name:'Inventario accesible',description:'Organiza objetos en tu propio proyecto.',type:'source',tags:[]};
  const profile=await page.evaluate(f=>window.RCCScriptArt.profile(f),fixture);assert.equal(profile.kind,'inventory');
  await page.evaluate(()=>{
   window.RCCNavigation.section('all');
   openScript(scripts.find(s=>!s.game));
  });
  assert(await page.locator('#modalBody .script-art-detail').isVisible());
  assert.match(await page.locator('#modalBody .script-art-label').textContent(),/NO ES UNA CAPTURA/);
  await page.evaluate(()=>closeModal());
  await context.route(/https:\/\/[^/]*rbxcdn\.com\//,route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE9sAAAAASUVORK5CYII=','base64')}));
  await page.evaluate(()=>{
   const s=scripts.find(s=>s.name.startsWith('Atherhub')&&s.game==='Blox Fruits');
   window.RCCNavigation.search(s.name);openScript(s);
  });
  await page.locator('#modalBody .reference-thumb img').waitFor();
  assert.match(await page.locator('#modalBody .reference-thumb img').getAttribute('alt'),/Blox Fruits/);
  await page.locator('#modalBody .reference-thumb img').dispatchEvent('error');
  assert(await page.locator('#modalBody .reference-thumb .script-art').isVisible());
  assert.equal(requests,0);assert.equal(await page.locator('#modalBody iframe').count(),0);
  await page.locator('#scriptVideoToggle').click();await page.locator('#scriptVideoPanel iframe').waitFor();
  assert.equal(requests,1);assert.match(await page.locator('#scriptVideoPanel iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\//);
  assert.match(await page.locator('.script-video-details').textContent(),/Reference channel/);
  await page.evaluate(()=>closeModal());assert.equal(await page.locator('#modalBody iframe').count(),0);
  mode='empty';await page.evaluate(()=>openScript(scripts.find(s=>s.name.startsWith('Atherhub')&&s.game==='Blox Fruits')));
  await page.locator('#scriptVideoToggle').click();await page.waitForFunction(()=>document.querySelector('.script-video-status').textContent.includes('No encontramos'));
  assert.equal(await page.locator('#scriptVideoPanel iframe').count(),0);
  assert.match(await page.locator('.script-video-controls a').getAttribute('href'),/^https:\/\/www.youtube.com\/results\?/);
  mode='error';await page.getByRole('button',{name:'Reintentar búsqueda',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.script-video-status').textContent.includes('No se pudo'));
  await page.evaluate(()=>closeModal());
  await page.locator('#scripts .card .card-video-button').first().click();await page.locator('#scriptVideoPanel').waitFor();
  assert.equal(await page.locator('#scriptVideoToggle').getAttribute('aria-expanded'),'true');
  await page.evaluate(()=>closeModal());
  await page.locator('#resetFilters').click();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.script-art-diagram>i').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.evaluate(()=>window.scrollTo({top:document.getElementById('scripts').offsetTop,behavior:'instant'}));
  await page.screenshot({path:'/tmp/rcc-script-art.png'});
  assert.deepEqual(errors,[]);
  console.log('Script media UI OK: all-card artwork, metadata-based visuals, image fallback, lazy video loading, player cleanup, missing/error states, card shortcut, mobile layout and reduced motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
