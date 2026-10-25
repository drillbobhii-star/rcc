// Usage: node tools/check-interface.cjs <validation-node_modules-directory>
// Requires a local server on port 8889; third-party traffic and form delivery are intercepted.
const path=require('node:path');
if(!process.argv[2]) throw new Error('Pass the external validation node_modules directory');
const {chromium}=require(path.join(path.resolve(process.argv[2]),'playwright'));
const catalog=require('../scripts.json');
const total=catalog.length;
const games=catalog.filter(s=>s.catalog_section==='games');
const web=catalog.filter(s=>s.catalog_section==='web');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1365,height:900},acceptDownloads:true});
 await context.route('**/*', route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='localhost'){
     if(url.pathname==='/api/visitors')return route.fulfill({json:{total:42}});
     return route.continue();
   }
   return route.abort();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://localhost:8889');await page.getByRole('button',{name:'Entendido, ir a buscar scripts',exact:true}).click();await page.waitForFunction(total=>document.querySelector('#statTotal').textContent===String(total),total);
 assert.equal(await page.locator('#scripts .card').count(),36);
 await page.locator('#webTab').click();assert.equal(await page.locator('#statTotal').textContent(),String(web.length));
 assert(await page.locator('#webTools').isVisible());assert(!(await page.locator('#gameTools').isVisible()));
 await page.locator('#scripts .card').first().click();assert(await page.locator('#modal').evaluate(el=>el.classList.contains('open')));
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar .html',exact:true}).click();assert((await download).suggestedFilename().endsWith('.html'));
 assert((await page.locator('#modalCode').textContent()).startsWith('<!doctype html>'));
 await page.getByRole('link',{name:'Notificar error',exact:true}).click();await page.waitForSelector('#supportForm');assert((await page.locator('#scriptReference').inputValue()).startsWith('rcc_web_'));
 await page.locator('[name=subject]').fill('Error en ejemplo de pestañas');await page.locator('[name=email]').fill('consulta@example.org');await page.locator('[name=message]').fill('Al abrir la página no encuentro la pestaña CSS. Estos son los pasos para reproducirlo.');
 await page.route('http://localhost:8889/',route=>route.request().method()==='POST'?route.fulfill({status:503,body:'unavailable'}):route.continue());
 await page.locator('#sendSupport').click();await page.waitForSelector('#formStatus[data-state=error]');assert((await page.locator('[name=message]').inputValue()).length>20);
 await page.route('http://localhost:8889/',route=>route.request().method()==='POST'?route.fulfill({status:200,body:'ok'}):route.continue());
 await page.locator('#sendSupport').click();await page.waitForSelector('#formStatus[data-state=success]');assert.equal(await page.locator('[name=message]').inputValue(),'');
 await page.goto('http://localhost:8889');await page.getByRole('button',{name:'Entendido, ir a buscar scripts',exact:true}).click();await page.waitForFunction(total=>document.querySelector('#statTotal').textContent===String(total),total);await page.locator('#gamesTab').click();assert.equal(await page.locator('#statTotal').textContent(),String(games.length));
 await page.locator('#originFilter').selectOption('community');assert((await page.locator('#resultCount').textContent()).startsWith(games.filter(s=>s.type==='loadstring').length+' '));
 await page.locator('#originFilter').selectOption('original');assert((await page.locator('#resultCount').textContent()).startsWith(games.filter(s=>s.tags.includes('Original RCC')).length+' '));
 await page.setViewportSize({width:390,height:844});await page.locator('#webTab').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto('http://localhost:8889/soporte.html');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Exercise all component starters in isolated browser pages, without external requests.
 for(const example of catalog.filter(s=>s.id.startsWith('rcc_web_tinta_'))){
  await page.goto('about:blank');await page.setContent(example.code);
  const key=example.id.replace('rcc_web_tinta_','');
  if(key==='counter'){await page.locator('#plus').click();assert.equal(await page.locator('#count').textContent(),'1');}
  if(key==='filter'){await page.locator('#query').fill('JavaScript');assert.equal(await page.locator('#items li:visible').count(),1);}
  if(key==='tabs'){await page.locator('#tab-1').click();assert(await page.locator('#panel-1').isVisible());await page.locator('#tab-1').press('ArrowRight');assert(await page.locator('#panel-2').isVisible());}
  if(key==='dialog'){await page.locator('#open').click();await page.getByRole('button',{name:'Confirmar',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#status').textContent==='Confirmado');}
  if(key==='accordion'){await page.locator('summary').first().click();assert(await page.locator('details').first().evaluate(el=>el.open));}
  if(key==='password'){await page.locator('#toggle').click();assert.equal(await page.locator('#password').getAttribute('type'),'text');}
  if(key==='text'){await page.locator('#text').fill('RCC');assert.equal(await page.locator('#remaining').textContent(),'237 caracteres disponibles');}
  if(key==='converter'){await page.locator('#celsius').fill('0');await page.getByRole('button',{name:'Convertir',exact:true}).click();assert.equal(await page.locator('#result').textContent(),'32.00 °F');}
  if(key==='sort'){await page.locator('#sort').click();assert.equal(await page.locator('#rows tr').first().locator('td').first().textContent(),'Bruma');}
  if(key==='quiz'){await page.locator('[value=js]').check();await page.getByRole('button',{name:'Comprobar',exact:true}).click();assert((await page.locator('#feedback').textContent()).startsWith('Correcto'));}
  if(key==='range'){await page.locator('#size').fill('40');assert.equal(await page.locator('#value').textContent(),'40 px');}
  if(key==='theme'){await page.locator('#theme').click();assert.equal(await page.locator('#theme').getAttribute('aria-pressed'),'true');}
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('Browser checks OK: catalog sections, pagination, downloads, report reference, form success/error, mobile layout, and all 12 web components. Form delivery mocked; no real submission sent.');
})().catch(error=>{console.error(error);process.exit(1);});
