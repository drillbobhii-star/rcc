const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('const votedIds ='),html.indexOf('\ninitializeAuth();'));
const els=new Map(),messages=[],requests=[];
const element=()=>({hidden:false,disabled:false,value:'',textContent:'',isConnected:true,
 classList:{contains:()=>false,add(){},remove(){}},setAttribute(){},addEventListener(){},querySelectorAll:()=>[],focus(){},reportValidity:()=>true});
let next={data:[],error:null};
let authListener;
const account={id:'a',email:'member@example.test'};
const supabase={auth:{getSession:async()=>({data:{session:null}}),signOut:async()=>({}),
 signInWithOAuth:async(options)=>{requests.push({oauth:options});return {}},
 signUp:async()=>({error:Error('already registered')}),
 signInWithPassword:async(credentials)=>{requests.push({login:credentials});return {data:{user:account,session:{user:account}}}},
 onAuthStateChange:listener=>{authListener=listener}},from(table){
 const query={select(){requests.push({table,method:'SELECT'});return query},eq(){return query},
 insert(row){requests.push({table,method:'INSERT',row});return query},
 delete(){requests.push({table,method:'DELETE'});return query},
 then(resolve,reject){return Promise.resolve(next).then(resolve,reject)}};return query;
}};
const context=vm.createContext({document:{getElementById:id=>{if(!els.has(id))els.set(id,element());return els.get(id)},body:{style:{}}},
 window:{rccSupabaseReady:Promise.resolve(supabase),rccAuthRedirect:'https://rcc-3m0.pages.dev'},location:{origin:'https://rcc.test',pathname:'/',assign(){}},URL,JSON,setTimeout,

 showToast:m=>messages.push(m),render(){},selectSection(){},closeSidebar(){},modal:element(),console});
vm.runInContext(`let currentUser=null,sessionRevision=0,favoriteIds=new Set(),favoritesStatus='ready',showFavorites=false,showRecent=false,currentCopiedId=null;const favoritePending=new Set();`+source,context);
(async()=>{
 await vm.runInContext(`toggleFavorite('sample',{})`,context);
 assert.equal(requests.length,0);assert.equal(messages.pop(),'Inicia sesión para guardar tus scripts favoritos en la nube');
 vm.runInContext(`currentUser={id:'a',email:'member@example.test'};`,context);
 await vm.runInContext(`toggleFavorite('sample',{})`,context);
 assert.equal(requests.at(-1).method,'INSERT');assert.equal(requests.at(-1).table,'favorites');assert.equal(requests.at(-1).row.user_id,'a');
 assert(vm.runInContext(`favoriteIds.has('sample')`,context));
 await vm.runInContext(`toggleFavorite('sample',{})`,context);
 assert.equal(requests.at(-1).method,'DELETE');assert(!vm.runInContext(`favoriteIds.has('sample')`,context));
 next={error:{message:'Temporalmente no disponible'}};
 await vm.runInContext(`toggleFavorite('failed',{})`,context);
 assert(!vm.runInContext(`favoriteIds.has('failed')`,context));assert.equal(messages.pop(),next.error.message);
 next={data:[{script_id:'other'}],error:null};
 await vm.runInContext(`loadFavorites()`,context);assert(vm.runInContext(`favoriteIds.has('other')`,context));
 await els.get('googleLoginBtn').onclick();assert.equal(requests.at(-1).oauth.provider,'google');assert.equal(requests.at(-1).oauth.options.redirectTo,'https://rcc-3m0.pages.dev');
 next={data:[],error:null};await vm.runInContext(`voteForScript('sample',{})`,context);assert.equal(requests.at(-2).table,'votes');assert.equal(requests.at(-2).method,'INSERT');
 await vm.runInContext(`submitAuth(true)`,context);assert(els.get('authStatus').textContent.includes('Ya se usó este correo'));
 els.get('authEmailInput').value='member@example.test';els.get('authPassword').value='test-password';
 await vm.runInContext(`submitAuth(false)`,context);
 assert.equal(requests.find(request=>request.login)?.login.email,'member@example.test');
 assert.equal(els.get('authEmail').textContent,'member@example.test');
 assert.equal(els.get('authPassword').value,'');
 await vm.runInContext(`initializeAuth()`,context);
 authListener('SIGNED_IN',{user:account});
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.equal(els.get('logoutBtn').hidden,false);
 await els.get('logoutBtn').onclick({currentTarget:element()});
 assert.equal(els.get('authEmail').hidden,true);
 await vm.runInContext(`applySession(null)`,context);
 assert.equal(vm.runInContext(`favoriteIds.size`,context),0);assert.equal(els.get('authEmail').hidden,true);
 await vm.runInContext(`applySession({id:'a',email:'member@example.test'})`,context);
 assert.equal(els.get('authEmail').textContent,'member@example.test');assert.equal(els.get('logoutBtn').hidden,false);
 await vm.runInContext(`applySession(null)`,context);
 assert.equal(vm.runInContext(`favoriteIds.size`,context),0);
 assert(!html.includes("fetch('/api/"),'Static catalog must not request backend routes');
 assert(html.includes("window.supabase.createClient('https://cbkrpyfkteomcukdisdw.supabase.co', anonKey"),'Client must connect directly to Supabase');
 assert(!html.includes('public-proxy'),'Client must not use the old proxy');
 console.log('Cloud UI OK: guest guard, favorite persistence and failures, duplicate signup, Google redirect and votes and session cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1});
