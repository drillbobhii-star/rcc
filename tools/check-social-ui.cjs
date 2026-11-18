// Usage: node tools/check-social-ui.cjs /path/to/node_modules [http://localhost:8889]
// Browser dependencies live outside this static site's production dependencies.
const {chromium}=require(require('node:path').resolve(process.argv[2],'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(12000);
  const profiles=[{user_id:'11111111-1111-4111-8111-111111111111',display_name:'RCC prueba',avatar_url:'',bio:'Perfil de prueba',roblox_username:'studio_test',show_roblox:true,is_creator:true},{user_id:'22222222-2222-4222-8222-222222222222',display_name:'Persona de prueba',avatar_url:'',bio:'',show_roblox:false,is_creator:false}];
  let saved=[];let profileRequests=0;
  await context.route('**/rest/v1/profiles*',route=>{
   profileRequests++;const url=new URL(route.request().url());const select=url.searchParams.get('select')||'';assert(!select.includes('email'),'Profile discovery must never select email');
   let rows=profiles;if(url.searchParams.get('is_creator')==='eq.true')rows=rows.filter(p=>p.is_creator);
   const query=url.searchParams.get('or')||'';if(query.includes('nadie'))rows=[];else if(query.includes('studio'))rows=rows.filter(p=>p.roblox_username==='studio_test');
   if(url.searchParams.has('user_id')&&url.searchParams.get('user_id').startsWith('in.'))rows=rows.filter(p=>saved.includes(p.user_id));
   return route.fulfill({json:rows});
  });
  await context.route('**/api/workbench',route=>{if(route.request().method()==='POST'){const body=route.request().postDataJSON();if(body.toggleProfile)saved=saved.includes(body.toggleProfile)?saved.filter(id=>id!==body.toggleProfile):[...saved,body.toggleProfile];}return route.fulfill({json:{settings:{},profiles:saved}});});
  await context.route('**/api/journey',route=>route.fulfill({json:{completed:true,state:null}}));
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.argv[3]||'http://localhost:8889',{waitUntil:'domcontentloaded'});
  await page.locator('.social-code-preview').first().waitFor();await page.locator('.social-suggestion').first().waitFor();
  assert.equal(await page.locator('.social-suggestion').count(),2);
  assert.equal(await page.locator('.social-code-preview').count(),27);
  assert.equal(await page.locator('.social-filters').getAttribute('open'),null);
  await page.locator('.social-open-code').first().click();assert(await page.locator('#modal.open').isVisible());await page.keyboard.press('Escape');
  await page.locator('[data-social-nav=people]').click();await page.locator('.social-person-card').first().waitFor();assert.equal(await page.locator('.social-person-card').count(),2);
  await page.locator('#wbProfileQuery').fill('studio_test');await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===1);
  await page.locator('.social-person-visit').first().click();await page.locator('.rcc-profile-dialog[open]').waitFor();await page.keyboard.press('Escape');
  await page.locator('#wbProfileQuery').fill('nadie');await page.waitForFunction(()=>document.getElementById('wbProfilesStatus').textContent.includes('No encontramos'));
  await page.locator('#wbProfileQuery').fill('');await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===2);
  await page.locator('.social-person-card .social-person-save').first().click();await page.waitForFunction(()=>document.querySelector('.social-person-card .social-person-save').getAttribute('aria-pressed')==='true');
  await page.locator('[data-view=saved]').click();await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===1);
  await page.locator('[data-view=creator]').click();await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===1);
  assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  await page.setViewportSize({width:390,height:844});await page.locator('[data-social-nav=home]').click();await page.locator('.social-more').click();await page.locator('.social-nav-bottom button').last().click();await page.locator('.wb-dialog[open]').waitFor();await page.keyboard.press('Escape');
  assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  await page.locator('.social-more').click();await page.getByRole('button',{name:'Mods APK',exact:true}).click();await page.locator('.social-apk-dialog[open]').waitFor();await page.locator('#wbApk').fill('prueba');assert((await page.locator('#wbApkStatus').innerText()).includes('prueba'));await page.keyboard.press('Escape');
  await page.setViewportSize({width:360,height:780});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  assert.deepEqual(errors,[]);assert(profileRequests>=4);
  console.log('Social UI OK: desktop/mobile feed, code modal, registered suggestions, name/Roblox search, empty state, public profile, saved profiles, creator filter and mobile settings; no browser errors or horizontal overflow.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
