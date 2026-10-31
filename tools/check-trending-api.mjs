import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
const state={fail:false,rows:[],writes:[],seen:new Set(),queries:[]};
globalThis.trendingTest=state;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
registerHooks({resolve(specifier,context,next){
 let source;
 if(specifier==='../../db/schema.js')source='export const scriptCopies={scriptId:"script_id",createdAt:"created_at"};';
 if(specifier==='drizzle-orm')source='export const count=()=>"count";export const desc=x=>x;export const gte=(...args)=>args;export const sql=(strings,...values)=>({strings,values});';
 if(specifier==='drizzle-orm/netlify-db')source=`export function drizzle(){const s=globalThis.trendingTest;return {
 select(){const q={from(){return q},where(value){s.queries.push(value);return q},groupBy(){return q},orderBy(){return q},async limit(n){if(s.fail)throw Error();return s.rows.slice(0,n)}};return q},
 insert(){return {values(value){return {async onConflictDoNothing(){if(s.fail)throw Error();s.writes.push(value);s.seen.add(value.scriptId+value.visitorId)}}}}}
 }};`;
 return source?{url:data(source),shortCircuit:true}:next(specifier,context);
}});
const {default:handler}=await import('../netlify/functions/trending.mts');
const id=JSON.parse(readFileSync('netlify/functions/lib/catalog-ids.json'))[0];
function request(method='GET',query='',headers={}){return handler(new Request('https://rcc.test/api/trending'+query,{method,headers}));}
assert.equal((await request('DELETE')).status,405);
assert.equal((await request('POST','?script='+id)).status,403);
assert.equal((await request('POST','?script=missing',{origin:'https://rcc.test'})).status,404);
let response=await request('POST','?script='+id,{origin:'https://rcc.test'});
assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert(cookie.includes('HttpOnly')&&cookie.includes('Secure')&&cookie.includes('SameSite=Lax'));
const visitor=state.writes.at(-1).visitorId;
response=await request('POST','?script='+id,{origin:'https://rcc.test',cookie:cookie.split(';')[0]});
assert.equal(response.headers.get('set-cookie'),null);assert.equal(state.writes.at(-1).visitorId,visitor);assert.equal(state.seen.size,1);
response=await request('POST','?script='+id,{origin:'https://rcc.test',cookie:'rcc_copy_visitor=invalid'});assert(response.headers.has('set-cookie'));
state.rows=[{id,copies:2}];response=await request();assert.deepEqual(await response.json(),{items:state.rows,days:7});assert(state.queries.at(-1)[1].strings.join('').includes("interval '7 days'"));
state.rows=[];assert.deepEqual((await (await request()).json()).items,[]);
state.fail=true;assert.equal((await request()).status,503);assert.equal((await request('POST','?script='+id,{origin:'https://rcc.test'})).status,503);
console.log('Trending API OK: rolling week query, anonymous daily deduplication, cookie validation, origin checks, unknown IDs, methods, empty and unavailable states.');
