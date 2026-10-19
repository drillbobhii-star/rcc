const fs = require('node:fs');
const assert = require('node:assert/strict');
const { transformSync } = require('esbuild');
const { randomUUID } = require('node:crypto');
// Exercise the real handler with an isolated database adapter; no live data is changed.
const source = fs.readFileSync('netlify/functions/visitors.mts','utf8')
  .replace(/^import .*;\n/gm, '')
  .replace(/^export const config:.*$/m, '')
  .replace('export default', 'const handler =');
const js = transformSync(source,{loader:'ts',target:'es2022'}).code;
const rows = new Set();
let unavailable = false;
const adapter = () => ({
  insert: () => ({values: ({id}) => ({onConflictDoNothing: async () => {
    if (unavailable) throw new Error('unavailable'); rows.add(id);
  }})}),
  select: () => ({from: async () => {
    if (unavailable) throw new Error('unavailable'); return [{total:rows.size}];
  }}),
});
const handler = new Function('drizzle','count','visitors','crypto',js+'\nreturn handler;')(adapter,()=>null,{}, {randomUUID});
const jar = new Map();
const context = {cookies:{get:name=>jar.get(name),set:cookie=>jar.set(cookie.name,cookie.value)}};
const request = method => new Request('https://rcc.example/api/visitors',{method,headers:{origin:'https://rcc.example'}});
(async () => {
  assert.deepEqual(await (await handler(request('GET'),context)).json(), {total:0});
  let response = await handler(request('POST'),context);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),{total:1});
  assert(jar.has('rcc_visitor'));
  const sameVisitor = await Promise.all(Array.from({length:10},()=>handler(request('POST'),context)));
  for (const result of sameVisitor) assert.equal((await result.json()).total,1);
  jar.clear();
  assert.equal((await (await handler(request('POST'),context)).json()).total,2);
  assert.equal((await (await handler(request('GET'),context)).json()).total,2);
  assert.equal((await handler(request('DELETE'),context)).status,405);
  assert.equal((await handler(new Request('https://rcc.example/api/visitors',{method:'POST',headers:{origin:'https://other.example'}}),context)).status,403);
  unavailable=true;
  assert.equal((await handler(request('GET'),context)).status,503);
  console.log('Visitors OK: shared total, cookie deduplication, concurrent repeat visits, read-only refresh, methods, origin and database failures.');
})().catch(error=>{console.error(error);process.exitCode=1;});
