// Usage: node tools/check-glass-update.cjs <external-node_modules>
// Start Netlify dev on port 8889 first. External services are intercepted.
const { chromium } = require(require('node:path').join(require('node:path').resolve(process.argv[2]), 'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:1365,height:900}});
 await context.route('**/*',route=>{const u=new URL(route.request().url()); if(u.hostname!=='localhost')return route.abort(); if(u.pathname.startsWith('/api/'))return route.fulfill({json:{items:[],total:0}}); return route.continue();});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8889');await page.locator('#welcomeDialog .welcome-confirm').click();await page.waitForSelector('.card');
 assert.equal(await page.locator('body').getAttribute('data-ui'),'blue');
 await page.locator('#appearanceToggle').click();
 for(const theme of ['black','blue','ios','android','hyper','nothing']){await page.locator(`[data-theme="${theme}"]`).click();assert.equal(await page.locator('body').getAttribute('data-ui'),theme);}
 await page.locator('#soundEnabled').check();await page.locator('[data-theme="blue"]').click();
 await page.locator('#cornerAmount').fill('32');await page.locator('#cornerAmount').dispatchEvent('input');
 await page.reload();await page.locator('#welcomeDialog .welcome-confirm').click();assert.equal(await page.locator('#cornerAmount').inputValue(),'32');
 await page.evaluate(()=>openRccLab('local greeting = "hola" -- comentario\nprint(greeting)','obfuscator'));
 await page.locator('#rccLab #generate').click();await page.waitForFunction(()=>document.querySelector('#rccLab').shadowRoot.getElementById('status').textContent.includes('Ofuscación terminada'));
 assert.match(await page.locator('#rccLab #result').textContent(),/\\104\\111\\108\\097/);
 await page.locator('#rccLab #source').fill('const x = "hello";');await page.locator('#rccLab #generate').click();assert.match(await page.locator('#rccLab #status').textContent(),/lenguaje/);
 assert.equal(await page.locator('#rccLab #javaTab').count(),0);
 await page.goto('http://localhost:8889');await page.locator('#welcomeDialog .welcome-confirm').click();await page.waitForSelector('.card');
 await page.evaluate(()=>openScript(scripts.find(s=>s.game_id && s.game_id!=='0' && s.tags.includes('Con clave'))));
 const play=page.locator('.game-links a').filter({hasText:'Jugar en Roblox'});assert.match(await play.getAttribute('href'),/^https:\/\/www.roblox.com\/games\/\d+$/);
 assert.match(await page.locator('.key-status').textContent(),/Requiere llave/);assert(await page.locator('.game-links a').filter({hasText:'Consultar llave'}).count());
 await page.getByRole('button',{name:'¿Qué hace este código?',exact:true}).click();assert.match(await page.locator('#rccLab #result').textContent(),/Juego \/ contexto:/);
 await page.goto('http://localhost:8889');await page.locator('#welcomeDialog .welcome-confirm').click();await page.setViewportSize({width:390,height:844});
 await page.locator('#hamburger').click();await page.locator('#appearanceToggle').click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'/tmp/rcc-mobile.png',fullPage:false});
 assert.deepEqual(errors,[]);console.log('Browser OK: six themes, saved controls, sounds, Lua worker output, JavaScript rejection, game/key links, per-entry analysis and mobile layout; no page errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
