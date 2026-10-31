const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(process.argv[2]||'/tmp/rcc-validation/node_modules');
const parser=require(path.join(root,'luaparse'));
const {lua,lauxlib,lualib,to_luastring}=require(path.join(root,'fengari'));
const catalog=JSON.parse(fs.readFileSync('scripts.json'));
const ids=new Set();for(const s of catalog){assert(!ids.has(s.id),s.id);ids.add(s.id);}
assert.deepEqual(JSON.parse(fs.readFileSync('netlify/functions/lib/catalog-ids.json')),catalog.map(s=>s.id));
for(const match of fs.readFileSync('index.html','utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const context={};vm.runInNewContext(fs.readFileSync('assets/catalog-filters.js','utf8'),context);
const f={section:'all',platform:'all',device:'all',executor:'all',type:'all',tag:'',environment:'all',verification:'all',game:'all',origin:'all',query:''};
const matches=context.RCCFilters.matches;
assert(catalog.every(s=>matches(s,f)));
for(const platform of ['roblox','fivem','autotouch','gameguardian','universal','web'])assert(catalog.filter(s=>matches(s,{...f,platform})).length>0);
assert(catalog.filter(s=>matches(s,{...f,device:'unknown'})).every(s=>s.device==='unknown'));
assert(catalog.filter(s=>matches(s,{...f,section:'web'})).every(s=>s.catalog_section==='web'));
assert.equal(matches({name:'Iluminación ambiental',platform:'roblox',device:'both',tags:[]},{...f,query:'ILUMINACION ambiental',device:'mobile'}),true);
assert.equal(matches({name:'Lua',platform:'universal',device:'both',tags:[]},{...f,platform:'roblox'}),false);
let parsed=0,executed=0;
function run(code,id){const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const status=lauxlib.luaL_dostring(L,to_luastring('print=function()end; alert=function()end; gg={alert=function()end};\n'+code));assert.equal(status,lua.LUA_OK,status===lua.LUA_OK?id: id+': '+lua.lua_tojsstring(L,-1));const result=lua.lua_tonumber(L,-1);lua.lua_close(L);return result;}
const filters=[()=>true,x=>x>0,x=>x<0,x=>x%2===0,x=>x%2!==0,x=>x>=0&&x<=20,x=>x>10,x=>x!==0];
const maps=[x=>x*2,x=>x/2,x=>x*x,Math.abs,x=>Math.floor(x+0.5),x=>Math.min(20,Math.max(0,x)),x=>x+10,x=>x/100];
const reducers=[a=>a.reduce((s,x)=>s+x,0),a=>a.length,a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,a=>a.length?Math.min(...a):0,a=>a.length?Math.max(...a):0,a=>a.length?Math.max(...a)-Math.min(...a):0,a=>a.reduce((s,x)=>s*x,1),a=>a[0]||0];
const fk=['todos','positivos','negativos','pares','impares','rango','mayores','nocero'],mk=['doble','mitad','cuadrado','absoluto','redondear','limitar','desplazar','porcentaje'],rk=['suma','cantidad','media','minimo','maximo','amplitud','producto','primero'];
for(const s of catalog){
 if(!s.id.startsWith('rcc_recipe_')&&!s.id.startsWith('rcc_data_'))continue;
 parser.parse(s.code,{luaVersion:'5.1'});parsed++;
 if(s.id.startsWith('rcc_data_')){
  const parts=s.id.split('_');const [, , , filter,map,reduce]=parts;
  for(const input of [[-12,-5,0,7,12,18,24,31],[],[7]]){
   const expected=reducers[rk.indexOf(reduce)](input.filter(filters[fk.indexOf(filter)]).map(maps[mk.indexOf(map)]));
   const actual=run(s.code+'\nreturn calculate({'+input.join(',')+'})',s.id);
   assert(Math.abs(actual-expected)<=1e-8*Math.max(1,Math.abs(expected)),`${s.id}: ${actual} != ${expected}`);executed++;
  }
 }else if(s.compatibility.environment==='lua'){run(s.code,s.id);executed++;}
}
console.log(`Catalog update OK: ${catalog.length} entries; ${parsed} Lua syntax checks; ${executed} Lua executions; filtering and catalog IDs consistent.`);
