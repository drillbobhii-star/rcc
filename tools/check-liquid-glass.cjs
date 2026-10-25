// Usage: node tools/check-liquid-glass.cjs <validation-node_modules-directory>
// Requires a local server on port 8889; external requests are blocked.
const path=require('node:path');
if(!process.argv[2]) throw new Error('Pass the external validation node_modules directory');
const {chromium}=require(path.join(path.resolve(process.argv[2]),'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 await context.route('**/*',route=>{const u=new URL(route.request().url()); if(u.hostname==='localhost'){if(u.pathname==='/api/visitors')return route.fulfill({json:{total:42}});return route.continue();}return route.abort();});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8889');
 assert(await page.locator('#welcomeDialog').isVisible());
 assert.equal(await page.locator('#welcomeTitle').textContent(),'⚠️ ¡Atención! Esta es una biblioteca de código, no una IA.');
 await page.screenshot({path:'/tmp/rcc-welcome.png'});
 await page.getByRole('button',{name:'Entendido, ir a buscar scripts',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement===document.querySelector('#search'));
 await page.waitForFunction(()=>document.querySelectorAll('#scripts .card').length===36);
 await page.screenshot({path:'/tmp/rcc-desktop.png',fullPage:true});
 await page.locator('#welcomeHelp').click();await page.keyboard.press('Escape');assert(!await page.locator('#welcomeDialog').isVisible());
 await page.keyboard.press('Control+k');await page.waitForFunction(()=>document.activeElement===document.querySelector('#search'));
 await page.locator('#search').fill('Temperaturas Solo positivos Duplicar Suma');
 await page.waitForFunction(()=>document.querySelector('#resultCount').textContent.startsWith('1 '));
 await page.locator('#scripts .card').first().click();
 await page.getByRole('button',{name:'📋 Copiar código',exact:true}).click();
 const code=await page.locator('#modalCode').textContent();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);
 await page.getByRole('button',{name:'Cerrar',exact:true}).click();
 await page.locator('#resetFilters').click();
 for(const width of [390,768]){
 await page.setViewportSize({width,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
 await page.locator('#hamburger').click();assert(await page.locator('#sidebar').isVisible());
 await page.locator('#webNav').click();assert(!await page.locator('#sidebar').evaluate(e=>e.classList.contains('open')));
 await page.locator('#welcomeHelp').click();assert(await page.locator('#welcomeDialog').isVisible());
 await page.getByRole('button',{name:'Entendido, ir a buscar scripts',exact:true}).click();
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/rcc-mobile.png',fullPage:true});
 const examples=require('../scripts.json').filter(x=>x.id.startsWith('rcc_pipeline_'));
 await page.setContent(examples[0].code);assert((await page.locator('#output').textContent()).includes('result'));
 await page.locator('#data').fill('[1,2,3]');await page.getByRole('button',{name:'Calcular resultado'}).click();assert.equal(JSON.parse(await page.locator('#output').textContent()).result,12);
 await page.locator('#data').fill('["x"]');await page.getByRole('button',{name:'Calcular resultado'}).click();assert((await page.locator('#output').textContent()).startsWith('Revisa los datos:'));
 assert.deepEqual(errors,[]);await browser.close();console.log('Guide, focus, keyboard shortcut, search, clipboard, mobile menu, overflow, and editable pipeline checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
