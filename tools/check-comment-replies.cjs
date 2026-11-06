const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
class Node {
  constructor(tag,text='',cls=''){this.style={};this.tag=tag;this.textContent=text;this.className=cls || '';this.children=[];this.isConnected=true;this.hidden=false;this.value='';this.classList={add:name=>{this.className+=' '+name;}};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;this.textContent='';}
  setAttribute(){}
  querySelector(selector){return this.children.find(n=>selector[0]==='.'?n.className.split(' ').includes(selector.slice(1)):n.tag===selector)||this.children.map(n=>n.querySelector(selector)).find(Boolean);}
  click(){this.onclick?.();}
  focus(){this.focused=true;}
  scrollIntoView(){}
}
const rows=[
  {id:3,parent_id:1,user_email:'member@example.com',text:'Respuesta'},
  {id:2,parent_id:null,user_email:'other@example.com',text:'Otro hilo'},
  {id:1,parent_id:null,user_email:'drillbobhii@gmail.com',text:'Principal'},
  {id:4,parent_id:3,user_email:'member@example.com',text:'Respuesta anidada'},
  {id:5,parent_id:99,user_email:'member@example.com',text:'Huérfano'},
  {id:6,parent_id:7,user_email:'member@example.com',text:'Ciclo A'},
  {id:7,parent_id:6,user_email:'member@example.com',text:'Ciclo B'}
].map(row=>({...row,user_id:'member',created_at:'2026-11-06T10:00:00Z'}));
let inserted,fail=false,loginCount=0;
const sb={from:table=>({select:()=>table==='profiles'?{in:async()=>({data:[]})}:{eq:()=>({order:async()=>({data:rows})})},insert:async data=>{inserted=data;return {error:fail?new Error('Inténtalo otra vez'):null};}})};
const body=new Node('main');
const context={window:{rccSupabaseReady:Promise.resolve(sb)},currentUser:{id:'member',email:'member@example.com'},modalBody:body,openAuth:()=>loginCount++,el:(...args)=>new Node(...args),document:{getElementById:()=>null}};
const source=fs.readFileSync('assets/member-community.js','utf8');
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  // --- 3.'),source.indexOf('  // --- 4.')),context);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  context.window.rccMountComments('script-a');await flush();
  const section=body.children[0],list=section.querySelector('.comment-list'),form=section.querySelector('form'),input=form.querySelector('textarea');
  assert.equal(list.textContent,'');
  const texts=()=>list.children.map(article=>article.children.find(n=>n.tag==='p').textContent);
  assert.deepEqual(texts(),['Otro hilo','Principal','Respuesta','Respuesta anidada','Huérfano','Ciclo A','Ciclo B']);
  const creator=list.children[1];
  assert.match(creator.className,/comment-creator/);
  assert.equal(creator.querySelector('.comment-creator-badge').textContent,'👑 Creador');
  assert.match(list.children[2].className,/comment-reply/);
  creator.querySelector('button').click();assert.equal(input.focused,true);
  input.value='Hola';fail=true;await form.onsubmit({preventDefault(){}});
  assert.equal(inserted.parent_id,1);assert.equal(input.value,'Hola');
  fail=false;await form.onsubmit({preventDefault(){}});
  assert.equal(inserted.script_id,'script-a');assert.equal(inserted.parent_id,1);assert.equal(input.value,'');
  input.value='Nuevo';await form.onsubmit({preventDefault(){}});assert.equal(inserted.parent_id,null);
  section.startReply(3,'Miembro');section.cancelReply();await form.onsubmit({preventDefault(){}});assert.equal(inserted.parent_id,null);
  section.startReply(3,'Miembro');context.currentUser=null;context.window.rccRefreshComposer();assert.equal(form.hidden,true);
  section.startReply(1,'Creador');assert.equal(loginCount,1);
  context.currentUser={id:'member',email:'member@example.com'};context.window.rccRefreshComposer();
  await form.onsubmit({preventDefault(){}});assert.equal(inserted.parent_id,null);
  console.log('Comentarios OK: hilos, ciclos, insignia, parent_id, errores, cancelación y sesión.');
})().catch(error=>{console.error(error);process.exitCode=1;});
