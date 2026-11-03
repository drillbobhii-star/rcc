import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/executor-downloads.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert.doesNotMatch(html,/background-music|musicPanel|musicExplorer|playlist de música/);
assert(!fs.existsSync('netlify/functions/music-search.mts'));
const warning=html.slice(html.indexOf('function executorWarning('),html.indexOf('function openScript('));
const detect={};vm.runInNewContext(warning,detect);
for(const code of ['loadstring(x)','game:HttpGet(x)','HTTPGET(x)'])assert.match(detect.executorWarning({code}),/data-open-executors/);
assert.equal(detect.executorWarning({code:'print(1)'}),'');
let now=0,dialog,active,focus=null,intervalId=0;
const intervals=new Map(),destinations=[],nodes=new Map();
class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.hidden=false;this.disabled=false;this.attributes={};}
  append(...items){this.children.push(...items);}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,fn){this.events[k]=fn;}
  querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Element(selector));return nodes.get(selector);}
  focus(){focus=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.events.close?.();}
  click(){this.events.click?.({target:this});}
}
const document={body:new Element('body'),createElement(tag){const el=new Element(tag);if(tag==='dialog')dialog=el;return el;},addEventListener(k,fn){if(k==='click')active=fn;}};
vm.runInNewContext(source,{document,URL,Date:{now:()=>now},setInterval(fn){const id=++intervalId;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);},window:{location:{assign(url){destinations.push(url);}}}});
const get=selector=>nodes.get(selector),buttons=get('.executor-options').children;
assert.equal(buttons.length,8);
const declaredPlatforms=[['PC · Windows'],['PC · Windows'],[],['PC · Windows'],['Móvil · Android'],['Móvil · Android'],[],['PC · Windows']];
buttons.forEach((button,index)=>{
  const badges=button.children[2].children[2].children;
  assert.equal(badges.length,3);
  assert.deepEqual(badges.filter(badge=>badge.className.includes('is-declared')).map(badge=>badge.children[0].textContent),declaredPlatforms[index]);
  for(const badge of badges){
    assert.match(badge.innerHTML,/aria-hidden="true"/);
    assert.match(badge.children[1].textContent,/^(Indicado por la fuente|Por confirmar)$/);
  }
});

for(const button of buttons){const image=button.children[0];assert(fs.existsSync(image.src));}
const trigger=new Element('button');trigger.closest=()=>trigger;
let prevented=false,stopped=false;
const open=()=>active({target:trigger,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
open();assert(dialog.open&&prevented&&stopped);
buttons[0].click();assert.equal(get('#executorProceed').disabled,true);assert.match(get('#executorCountdown').textContent,/10 segundos/);
get('#executorProceed').click();assert.equal(destinations.length,0);
now=9999;for(const fn of intervals.values())fn();assert.equal(get('#executorProceed').disabled,true);
get('#executorProceed').click();assert.equal(destinations.length,0);
get('#executorCancel').click();assert.equal(intervals.size,0);assert.equal(focus,buttons[0]);
buttons[4].click();assert.match(get('#executorCountdown').textContent,/10 segundos/);
now+=10000;for(const fn of [...intervals.values()])fn();assert.equal(get('#executorProceed').disabled,false);
get('#executorProceed').click();assert.deepEqual(destinations,['https://deltaexploits.dev/delta-executor-android']);assert.equal(dialog.open,false);assert.equal(intervals.size,0);assert.equal(focus,trigger);
open();buttons[2].click();dialog.close();assert.equal(intervals.size,0);open();buttons[1].click();assert.match(get('#executorCountdown').textContent,/10 segundos/);
let escaped=false;dialog.events.keydown({stopPropagation(){escaped=true;}});assert(escaped);
const image=buttons[0].children[0],fallback=buttons[0].children[1];image.events.error();assert(image.hidden&&!fallback.hidden);
dialog.close();assert.equal(intervals.size,0);
console.log('Executor panel OK: eight destinations, local icons, compatibility trigger, early-click rejection, 10-second delay, cancellation, reopen reset, redirect, focus return, Escape isolation and image fallback. Music removed.');
