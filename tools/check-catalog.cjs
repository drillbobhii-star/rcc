// Run from the repository root: node tools/check-catalog.cjs
// Checks data integrity and page JavaScript, without executing catalog code.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'scripts.json'), 'utf8'));
const ids = new Set();
const newCode = new Set();
const counts = { lua: 0, client: 0, server: 0, legacy: 0, browser: 0 };
for (const s of scripts) {
  for (const key of ['id', 'name', 'code', 'platform', 'device', 'type']) {
    assert.equal(typeof s[key], 'string', `${s.id}: ${key}`);
    assert(s[key].trim(), `${s.id}: empty ${key}`);
  }
  assert(!ids.has(s.id), `Duplicate ID: ${s.id}`);
  ids.add(s.id);
  assert(['pc', 'mobile', 'both', 'unknown'].includes(s.device), s.id);
  assert(['source', 'loadstring'].includes(s.type), s.id);
  assert(['roblox', 'universal', 'fivem', 'gameguardian', 'autotouch', 'web'].includes(s.platform), s.id);
  for (const key of ['tags', 'executors']) {
    assert(Array.isArray(s[key]), `${s.id}: ${key}`);
    assert(s[key].every(v => typeof v === 'string' && v.trim()), s.id);
    assert.equal(new Set(s[key]).size, s[key].length, `${s.id}: duplicate ${key}`);
  }
  if (s.catalog_section === 'web') {
    assert.equal(s.platform, 'web');
    assert.equal(s.file_extension, 'html');
    assert.equal(s.compatibility.environment, 'browser');
    assert.equal(s.compatibility.verification, 'js-syntax');
    assert(s.code.startsWith('<!doctype html>'));
    assert(s.code.includes('<html lang="es">'));
    assert(s.code.includes('name="viewport"'));
    for (const match of s.code.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1], {filename:s.id});
    assert(!newCode.has(s.code), `Duplicate web starter: ${s.id}`);
    newCode.add(s.code);
    counts.browser++;
    continue;
  }
  if (s.catalog_section === 'games' && !s.id.startsWith('rcc_recipe_')) {
    assert.equal(s.platform, 'roblox');
    assert.equal(s.type, 'loadstring');
    assert.equal(s.device, 'unknown');
    assert.equal(s.compatibility.verification, 'unverified');
    assert(s.game && s.compatibility.sources.length, `${s.id}: missing game or source`);
    assert(s.code.includes('loadstring') && s.code.includes('https://'), s.id);
    for (const source of s.compatibility.sources) assert.equal(new URL(source).protocol, 'https:');
    continue;
  }
  const added = s.id.startsWith('lua_') || s.id.startsWith('learn_rbx_') || s.id.startsWith('rcc_recipe_');
  if (!added) { counts.legacy++; continue; }
  assert(!newCode.has(s.code), `Duplicate new code: ${s.id}`);
  newCode.add(s.code);
  const c = s.compatibility;
  assert(c && ['lua', 'client', 'server'].includes(c.environment), `${s.id}: environment`);
  counts[c.environment]++;
  for (const key of ['runtime', 'context', 'requirements', 'test_details', 'mobile_status']) {
    assert(typeof c[key] === 'string' && c[key].trim(), `${s.id}: ${key}`);
  }
  assert(['unverified', 'not-applicable'].includes(c.executor_status), s.id);
  assert(!/loadstring\s*\(|HttpGet\s*\(|while\s+true\s+do/.test(s.code), `${s.id}: unexpected remote dependency or infinite loop`);
  assert(c.sources.length >= 2, `${s.id}: missing sources`);
  for (const source of c.sources) assert.equal(new URL(source).protocol, 'https:');
  if (c.environment === 'lua') {
    assert.equal(s.platform, 'universal');
    assert.equal(c.verification, 'lua-tested');
    assert(!/game:GetService|Instance\.new/.test(s.code), s.id);
  } else {
    assert.equal(s.platform, 'roblox');
    assert.equal(c.verification, 'syntax-only');
  }
  if (c.environment === 'server') {
    assert.deepEqual(s.executors, ['Roblox Studio (servidor)']);
    assert.equal(c.executor_status, 'not-applicable');
  }
}
assert(counts.lua >= 435 && counts.server >= 326 && counts.client >= 45 && counts.browser >= 144, 'Expected expanded learning libraries');
assert(scripts.filter(s=>s.catalog_section==='games' && s.type==='loadstring').length >= 2800, 'Expected expanded community library');
for (const file of ['index.html', 'admin.html', 'soporte.html', 'soporte-enviado.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1], { filename: file });
  }
}
new vm.Script(fs.readFileSync(path.join(root,'assets/support.js'),'utf8'));
const support=fs.readFileSync(path.join(root,'soporte.html'),'utf8');
assert(support.includes('data-netlify="true"') && support.includes('netlify-honeypot="bot-field"'));
for (const field of ['form-name','subject','email','category','script','environment','message','bot-field']) assert(support.includes(`name="${field}"`), `Missing support field: ${field}`);
assert(fs.existsSync(path.join(root, 'compatibilidad.html')));
console.log(`Catalog OK: ${scripts.length} scripts; ${JSON.stringify(counts)}. Page JavaScript syntax OK.`);
