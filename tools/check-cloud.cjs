const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('const authModal ='),html.indexOf('\ninitializeAuth();'));
const els=new Map(),messages=[],writes=[];
const element=()=>({hidden:false,textContent:'',classList:{contains:()=>false,add(){},remove(){}},addEventListener(){},querySelectorAll:()=>[],focus(){}});
const context=vm.createContext({document:{getElementById:id=>{if(!els.has(id))els.set(id,element());return els.get(id);},body:{style:{}}},setTimeout,showToast:m=>messages.push(m),render(){},selectSection(){},closeSidebar(){},modal:element(),console});
context.writes=writes;
vm.runInContext(`let currentUser=null,sessionRevision=0,favoriteIds=new Set(),favoritesStatus='ready',showFavorites=false,showRecent=false;const favoritePending=new Set();const cloud={from(table){return {insert(row){writes.push({table,row});return Promise.resolve({error:null})},delete(){return {eq(){return {eq(){return Promise.resolve({error:null})}}}}}}}};`+source,context);
(async()=>{
await vm.runInContext(`toggleFavorite('sample',{})`,context);assert.equal(writes.length,0);assert.equal(messages.pop(),'Inicia sesión para guardar tus scripts favoritos en la nube');
vm.runInContext(`currentUser={id:'user-a'};`,context);
await vm.runInContext(`toggleFavorite('sample',{})`,context);assert.equal(writes[0].table,'favorites');assert.equal(writes[0].row.user_id,'user-a');assert(vm.runInContext(`favoriteIds.has('sample')`,context));
await vm.runInContext(`toggleFavorite('sample',{})`,context);assert(!vm.runInContext(`favoriteIds.has('sample')`,context));
await vm.runInContext(`voteForScript('sample',{})`,context);assert.equal(writes[1].table,'votes');assert.equal(writes[1].row.script_id,'sample');
await vm.runInContext(`applySession(null)`,context);assert.equal(vm.runInContext(`favoriteIds.size`,context),0);assert.equal(els.get('authEmail').hidden,true);
console.log('Cloud interactions OK: guest guard, favorite insert/delete, vote insert, logout cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
