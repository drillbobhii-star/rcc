import {readCatalog} from './catalog-store.cjs';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

const state = { user: null, rows: [], writes: [], fail: false };
globalThis.communityTest = state;
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const fakeSchema = ['favorites','votes','comments'].map(name => `export const ${name}={table:'${name}',userId:'user_id',scriptId:'script_id',id:'id',createdAt:'created_at',body:'body',author:'author'};`).join('\n');
registerHooks({resolve(specifier,context,next){
  let source;
  if(specifier==='@netlify/identity')source='export async function getUser(){return globalThis.communityTest.user}';
  if(specifier==='../../db/schema.js')source=fakeSchema;
  if(specifier==='drizzle-orm')source=`export const eq=(a,b)=>({eq:[a,b]});export const and=(...args)=>({and:args});export const sql=(strings,...values)=>({strings,values});export const desc=a=>a;export const count=()=>0;`;
  if(specifier==='drizzle-orm/netlify-db')source=`
  export function drizzle(){const s=globalThis.communityTest;return {
    select(){const q={from(){return q},where(){return q},orderBy(){return q},limit(){return q},then(ok,bad){return (s.fail?Promise.reject(Error('unavailable')):Promise.resolve(s.rows.shift()||[])).then(ok,bad)}};return q},
    insert(table){return {values(value){s.writes.push({insert:table.table,value});return {onConflictDoNothing:async()=>{},returning:async()=>[{id:'123',...value,createdAt:new Date()}]}}}},
    delete(table){return {where(condition){s.writes.push({delete:table.table,condition});return Promise.resolve()}}}
  }};`;
  return source?{url:moduleUrl(source),shortCircuit:true}:next(specifier,context);
}});
const {default:handle}=await import('../netlify/functions/community.mts');
const catalog=readCatalog();
const ids=JSON.parse(readFileSync(new URL('../netlify/functions/lib/catalog-ids.json',import.meta.url)));
assert.deepEqual(ids,catalog.map(s=>s.id),'Server catalog IDs must match the catalog');
const script=encodeURIComponent(ids[0]);
function request(action,method='GET',body,origin='https://rcc.test',extra=''){
  return new Request(`https://rcc.test/api/community?action=${action}&script=${script}${extra}`,{method,headers:{origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
assert.equal((await handle(request('like','PUT'))).status,401);
assert.equal(state.writes.length,0);
assert.equal((await handle(request('comment','POST',{body:'test'},'https://other.test'))).status,403);
assert.equal((await handle(new Request('https://rcc.test/api/community?action=thread&script=missing'))).status,404);
state.rows=[[{value:2}],[{id:'c1',author:'Autor',body:'<img onerror=alert(1)>',userId:'a',createdAt:new Date()}]];
let data=await (await handle(request('thread'))).json();
assert.equal(data.likes,2);assert.equal(data.liked,false);assert.equal(data.comments[0].mine,false);
assert.equal('userId' in data.comments[0],false);
assert.equal((await handle(request('thread','GET',undefined,undefined,'&before=wrong'))).status,400);
state.user={id:'a',email:'member@example.test'};
assert.equal((await handle(request('like','PUT'))).status,401,'Unconfirmed accounts cannot write');
state.user.confirmedAt=new Date().toISOString();
assert.equal((await handle(request('like','PUT',{userId:'forged'}))).status,200);
assert.equal(state.writes.at(-1).value.userId,'a','The session owns the write');
assert.equal((await handle(request('favorite','DELETE'))).status,200);
assert.deepEqual(state.writes.at(-1).condition.and[0],{eq:['user_id','a']});
state.rows=[[{id:ids[0]}]];
data=await (await handle(request('favorites'))).json();assert.deepEqual(data.ids,[ids[0]]);
assert.equal((await handle(request('comment','POST',{body:' '.repeat(3)}))).status,400);
assert.equal((await handle(request('comment','POST',{body:'x'.repeat(2001)}))).status,400);
assert.equal((await handle(request('comment','POST',{body:'Comentario',userId:'forged',author:'forged'}))).status,201);
assert.equal(state.writes.at(-1).value.author,'member');assert.equal(state.writes.at(-1).value.userId,'a');
await handle(request('comment','DELETE',undefined,undefined,'&id=12345678-1234-1234-1234-123456789abc'));
assert.deepEqual(state.writes.at(-1).condition.and.at(-1),{eq:['user_id','a']},'Only an author can delete');
state.rows=[[{value:1}],[{id:ids[0]}],Array.from({length:31},(_,i)=>({id:String(i),userId:i?'b':'a',createdAt:new Date(2026,0,31-i),author:'Autor',body:'Comentario'}))];
data=await (await handle(request('thread'))).json();
assert.equal(data.comments.length,30);assert(data.next);assert.equal(data.comments[0].mine,true);assert.equal(data.liked,true);
state.fail=true;assert.equal((await handle(request('favorites'))).status,503);
console.log('Community API OK: public reads, confirmation, ownership, validation, pagination and unavailable storage.');
