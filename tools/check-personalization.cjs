// Run with a local Netlify dev server on port 8889 and an external Playwright installation.
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(path.join(path.resolve(process.argv[2]), 'playwright'));
(async () => {
  const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:1365,height:900}});
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if(url.hostname !== 'localhost') return route.abort();
      if(url.pathname === '/api/visitors') return route.fulfill({json:{total:42}});
      return route.continue();
    });
    const page = await context.newPage();
    const errors=[];page.on('pageerror', error=>errors.push(error.message));
    await page.goto('http://localhost:8889');
    await page.waitForSelector('#scripts .card');
    await page.locator('#appearanceToggle').click();
    assert(await page.locator('#personalization').getAttribute('open') !== null);
    for(const theme of ['android','hyper','nothing','ios']) {
      await page.locator(`[data-theme="${theme}"]`).click();
      assert.equal(await page.locator('body').getAttribute('data-ui'),theme);
    }
    const previous=await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor);
    await page.locator('[data-theme="hyper"]').click();
    assert.notEqual(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),previous);
    await page.locator('#accentColor').evaluate(el=>{el.value='#f4cb88';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).getPropertyValue('--accent').trim()),'#f4cb88');
    await page.locator('#motionEnabled').uncheck();
    await page.locator('#density').selectOption('compact');
    await page.reload();
    assert.equal(await page.locator('body').getAttribute('data-ui'),'hyper');
    assert.equal(await page.locator('#accentColor').inputValue(),'#f4cb88');
    assert.equal(await page.locator('body').getAttribute('data-density'),'compact');
    assert(await page.locator('body').evaluate(el=>el.classList.contains('motion-paused')));
    await page.locator('#gamesTab').click();
    assert.equal(await page.locator('body').getAttribute('data-ui'),'hyper');
    await page.setViewportSize({width:390,height:844});
    await page.locator('#hamburger').click();
    await page.locator('#appearanceToggle').click();
    assert(await page.locator('#personalization summary').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#resetAppearance').click();
    assert.equal(await page.locator('body').getAttribute('data-ui'),'black');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#bgRccText').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.addInitScript(()=>{
      Storage.prototype.getItem=()=>{throw new Error('Storage blocked')};
      Storage.prototype.setItem=()=>{throw new Error('Storage blocked')};
    });
    await page.reload();await page.waitForSelector('#scripts .card');
    assert.deepEqual(errors,[]);
    console.log('Appearance OK: four themes, accent, saved preferences, reset, mobile layout, reduced motion, blocked storage and catalog navigation.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
