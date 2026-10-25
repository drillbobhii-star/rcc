const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('const votedIds ='),html.indexOf('\ninitializeAuth();'));
const els=new Map(),messages=[],requests=[];
const element=()=>({hidden:false,disabled:false,value:'',textContent:'',isConnected:true,
 classList:{contains:()=>false,add(){},remove(){}},setAttribute(){},addEventListener(){},querySelectorAll:()=>[],focus(){},reportValidity:()=>true});
const identity={logout:async()=>{},getSettings:async()=>({providers:{google:false}}),getUser:async()=>({id:'a',email:'member@example.test',confirmedAt:'2026-01-01'}),
 signup:async()=>{throw Error('A user with this email address has already been registered')},login:async()=>identity.getUser(),requestPasswordRecovery:async()=>{}};
let next={ids:[]};
let responseStatus=200;
const context=vm.createContext({document:{getElementById:id=>{if(!els.has(id))els.set(id,element());return els.get(id)},body:{style:{}}},
 window:{rccIdentityReady:Promise.resolve(identity)},location:{origin:'https://rcc.test',pathname:'/',assign(){}},URL,JSON,setTimeout,
 fetch:async(url,options)=>{requests.push({url,options});return {ok:responseStatus===200,json:async()=>next}},
 showToast:m=>messages.push(m),render(){},selectSection(){},closeSidebar(){},modal:element(),console});
vm.runInContext(`let currentUser=null,sessionRevision=0,favoriteIds=new Set(),favoritesStatus='ready',showFavorites=false,showRecent=false,currentCopiedId=null;const favoritePending=new Set();`+source,context);
(async()=>{
 await vm.runInContext(`toggleFavorite('sample',{})`,context);
 assert.equal(requests.length,0);assert.equal(messages.pop(),'Inicia sesión para guardar tus scripts favoritos en la nube');
 vm.runInContext(`currentUser={id:'a',email:'member@example.test'};`,context);
 await vm.runInContext(`toggleFavorite('sample',{})`,context);
 assert.equal(requests.at(-1).options.method,'PUT');assert(requests.at(-1).url.includes('action=favorite'));
 assert(vm.runInContext(`favoriteIds.has('sample')`,context));
 await vm.runInContext(`toggleFavorite('sample',{})`,context);
 assert.equal(requests.at(-1).options.method,'DELETE');assert(!vm.runInContext(`favoriteIds.has('sample')`,context));
 responseStatus=503;next={error:'Temporalmente no disponible'};
 await vm.runInContext(`toggleFavorite('failed',{})`,context);
 assert(!vm.runInContext(`favoriteIds.has('failed')`,context));assert.equal(messages.pop(),next.error);
 responseStatus=200;next={ids:['other']};
 await vm.runInContext(`loadFavorites()`,context);assert(vm.runInContext(`favoriteIds.has('other')`,context));
 await els.get('googleLoginBtn').onclick();assert(els.get('authStatus').textContent.includes('aún no está habilitado'));
 await vm.runInContext(`submitAuth(true)`,context);assert(els.get('authStatus').textContent.includes('Ya se usó este correo'));
 await vm.runInContext(`applySession(null)`,context);
 assert.equal(vm.runInContext(`favoriteIds.size`,context),0);assert.equal(els.get('authEmail').hidden,true);
 await vm.runInContext(`applySession({id:'a',email:'member@example.test'})`,context);
 assert.equal(els.get('authEmail').textContent,'member@example.test');assert.equal(els.get('logoutBtn').hidden,false);
 await vm.runInContext(`applySession(null)`,context);
 assert.equal(vm.runInContext(`favoriteIds.size`,context),0);
 assert(html.includes('body.textContent=comment.body'),'Comments must render as text');
 assert(html.includes('renderCommunity(String(s.id))'),'Script dialog must include comments');
 console.log('Cloud UI OK: guest guard, favorite persistence and failures, duplicate signup, Google availability and session cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1});
