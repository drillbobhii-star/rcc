import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { normalizeScript, safeUrl } = require('./import-greasyfork.cjs');

assert.equal(safeUrl('https://greasyfork.org/en/scripts/123-demo',['greasyfork.org']), 'https://greasyfork.org/en/scripts/123-demo');
assert.equal(safeUrl('http://greasyfork.org/en/scripts/123-demo',['greasyfork.org']), null);
assert.equal(safeUrl('https://evil.example/script',['greasyfork.org']), null);
assert.equal(safeUrl('https://user:pass@greasyfork.org/en/scripts/123',['greasyfork.org']), null);

const row = {
  id: 12345,
  name: 'Example utility',
  description: 'A small browser enhancement.',
  url: 'https://greasyfork.org/en/scripts/12345-example-utility',
  code_url: 'https://update.greasyfork.org/scripts/12345/code/Example.user.js',
  version: '2.0',
  license: 'MIT',
  created_at: '2026-10-30T12:00:00.000Z',
  total_installs: 2500,
  daily_installs: 25
};
const entry = normalizeScript(row, '2026-11-17T00:00:00.000Z');
assert.equal(entry.id, 'greasyfork_12345');
assert.equal(entry.platform, 'web');
assert.equal(entry.catalog_section, 'web');
assert.equal(entry.source_only, true);
assert(entry.tags.includes('RCC'));
assert(entry.tags.includes('Userscript'));
assert(entry.tags.includes('Licencia declarada: MIT'));
assert.equal(entry.compatibility.total_installs, 2500);
assert(entry.compatibility.sources.includes(row.code_url));
assert.equal(entry.code.includes('function'), false);
assert.equal(normalizeScript({...row,id:'bad'}), null);
assert.equal(normalizeScript({...row,name:'Cookie stealer',description:'keylogger and password steal'}), null);
console.log('Greasy Fork metadata importer checks passed.');
