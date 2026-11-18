// Browser regression: directory pagination, global suggestions and newly registered profiles.
const {chromium}=require(require('node:path').resolve(process.argv[2],'playwright'));
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(15000);
  const profiles=Array.from({length:106},(_,i)=>({user_id:'test-'+String(i).padStart(3,'0'),display_name:'Persona '+String(i).padStart(3,'0'),avatar_url:'',show_roblox:false,is_creator:false}));
  let failed=false,queries=[];
  await context.route('**/rest/v1/profiles*',route=>{
   const url=new URL(route.request().url()),term=url.searchParams.get('or')||'';queries.push(url);
   assert(!url.searchParams.get('select').includes('email'));
   if(failed)return route.fulfill({status:503,json:{message:'Temporary test outage'}});
   let rows=profiles.filter(p=>!term||term.includes(p.display_name)||!term.includes('Fuera')&&!term.includes('Recién'));
   if(term.includes('Fuera'))rows=profiles.filter(p=>p.display_name.includes('Fuera'));
   if(term.includes('Recién'))rows=profiles.filter(p=>p.display_name.includes('Recién'));
   const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||rows.length);
   return route.fulfill({json:rows.slice(offset,offset+limit)});
  });
  await context.route('**/api/workbench',route=>route.fulfill({json:{settings:{},profiles:[]}}));
  await context.route('**/api/journey',route=>route.fulfill({json:{completed:true,state:null}}));
  profiles[95].display_name='Fuera de los destacados';
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[3]||'http://localhost:8889',{waitUntil:'domcontentloaded'});
  await page.locator('.social-code-preview').first().waitFor();
  assert(await page.locator('#scripts .script-category-image').first().isVisible(),'Category artwork must be visible in social posts');
  assert(await page.locator('.social-wordmark .rcc-monogram').isVisible());
  await page.getByRole('button',{name:'Ejecutores compatibles',exact:true}).click();await page.locator('#executorDrawer[open]').waitFor();await page.keyboard.press('Escape');
  await page.locator('[data-social-nav=people]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===48);
  const more=page.locator('#wbProfiles + button');await more.click();await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===96);
  await more.click();await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===106);assert(await more.isHidden());
  const input=page.locator('#wbProfileQuery');await input.click();
  await page.waitForFunction(()=>document.querySelectorAll('#wbProfileSuggestions [role=option]').length===8);
  await page.getByRole('button',{name:'Cargar más nombres',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#wbProfileSuggestions [role=option]').length===16);
  await input.fill('Fuera');await page.locator('#wbProfileSuggestions').getByText('Fuera de los destacados',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.social-person-card').length===1);
  await input.press('ArrowDown');assert(await page.locator('#wbProfileSuggestions [role=option]').evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Escape');assert(await page.locator('#wbProfileSuggestions').isHidden());
  profiles.push({user_id:'new-test',display_name:'Recién registrado',avatar_url:'',show_roblox:false,is_creator:false});
  await input.fill('Recién');await page.locator('#wbProfileSuggestions').getByText('Recién registrado',{exact:true}).waitFor();
  // Focus refresh discovers a new registration without reloading the site.
  profiles.push({user_id:'new-test-2',display_name:'Recién llegado',avatar_url:'',show_roblox:false,is_creator:false});
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.locator('#wbProfileSuggestions').getByText('Recién llegado',{exact:true}).waitFor();
  failed=true;await input.fill('error');await page.locator('#wbProfileSuggestions').getByText('No se pudieron cargar los nombres.',{exact:true}).waitFor();
  failed=false;await page.locator('#wbProfileSuggestions').getByRole('button',{name:'Reintentar',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#wbProfileSuggestions [role=option]').length===8);
  await page.setViewportSize({width:390,height:844});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  await page.locator('[data-social-nav=home]').click();assert(await page.locator('.social-mobile-brand .rcc-monogram').isVisible());
  await page.locator('.social-more').click();await page.getByRole('button',{name:'Ejecutores compatibles',exact:true}).click();await page.locator('#executorDrawer[open]').waitFor();
  assert.deepEqual(errors,[]);assert(queries.some(url=>Number(url.searchParams.get('offset'))===96));
  await page.keyboard.press('Escape');await page.screenshot({path:'/tmp/rcc-mobile.png'});
  console.log('Profile discovery OK: all 106 profiles paginated; suggestions beyond first 20; incremental names, keyboard, new registrations, focus refresh, outage/retry, mobile executor access and visible artwork/logo.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
