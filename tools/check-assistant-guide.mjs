import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync('assets/assistant-guide.js','utf8'),context);
const guide=context.window.RCCAssistantGuide;
for(const [text,action] of [['que es loadstring','requirements'],['windows bloquea la descarga','safety'],['como cancelo una descarga','downloads'],['panel de ejecutores','executors'],['que cambio en esta actualizacion','release'],['scripts nuevos','updates']])assert.equal(guide.resolve(text).action,action);
assert.equal(guide.resolve('inventario Lua'),null);
assert.equal(guide.resolve('donde encuentro inventario').query,'inventario');
assert.equal(guide.resolve('otras preguntas').action,'questions');
for(const topic of ['all','catalog','updates','safety','navigation']) {
  const subjects=['Inventario','<img src=x onerror=alert(1)>'];
  const items=guide.sample(subjects,topic,4,()=>0);
  assert.equal(new Set(items.map(i=>i.label)).size,items.length);
  assert(items.every(i=>i.query?subjects.includes(i.query):typeof i.action==='string'));
}
assert.equal(guide.sample([],'catalog').length,0);
assert.equal(guide.sample([],'all').length,4);
const files=fs.readdirSync('catalog').filter(name=>name.endsWith('.json'));
const subjects=new Set();
for(const file of files){const data=JSON.parse(fs.readFileSync('catalog/'+file,'utf8'));const rows=Array.isArray(data)?data:data.scripts||[];rows.forEach(row=>{if(row.name)subjects.add(row.name);});}
assert(subjects.size>0);
assert(guide.count([...subjects],'catalog')>=200000);
console.log(`Assistant guide OK: ${subjects.size} catalog titles, ${guide.count([...subjects],'all').toLocaleString('es')} question combinations, topic filters, empty states, non-repeating batches and warning intents.`);
