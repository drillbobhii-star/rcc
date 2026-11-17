import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { isFiveMResource, topicToEntry } = require('../tools/import-fivem.cjs');
const sample = {
  id: 782341, slug: 'sample-qbcore-inventory', title: 'QBCore Inventory Resource',
  excerpt: 'An inventory resource for QBCore servers.',
  tags: ['fivem-scripts', 'qbcore', 'free'], created_at: '2026-11-15T10:00:00Z',
  last_poster_username: 'ExampleDev'
};
assert.equal(isFiveMResource(sample), true);
const entry = topicToEntry(sample, '2026-11-17T12:00:00Z');
assert.equal(entry.id, 'fivem_cfx_782341');
assert.equal(entry.platform, 'fivem');
assert.equal(entry.catalog_section, 'fivem');
assert.equal(entry.type, 'source');
assert.equal(entry.level, 'free');
assert.equal(entry.source_only, true);
assert.match(entry.code, /no contiene el código del recurso/);
assert.match(entry.compatibility.sources[0], /^https:\/\/forum\.cfx\.re\/t\//);
assert.match(entry.compatibility.requirements, /licencia/);
assert.doesNotMatch(entry.code, /loadstring|HttpGet/);
assert.equal(topicToEntry({ ...sample, id: 782342, tags: ['script', 'paid'] }).level, 'paid');
assert.equal(topicToEntry({ ...sample, id: 782343, tags: ['script'] }).level, 'external');
assert.equal(topicToEntry({ ...sample, id: 782344, tags: ['map', 'vehicle'] }), null);
assert.equal(topicToEntry({ ...sample, id: 'not-numeric' }), null);
assert.equal(topicToEntry({ ...sample, title: 'Backdoor credential stealer' }), null);
const source = await readFile(new URL('../tools/import-fivem.cjs', import.meta.url), 'utf8');
const workflow = await readFile(new URL('../.github/workflows/expand-static-catalog.yml', import.meta.url), 'utf8');
assert(source.includes("const SOURCE_BASE = 'https://forum.cfx.re';"));
assert(source.includes("const CATEGORY_URL = SOURCE_BASE + '/c/releases/7.json';"));
assert.match(source, /RCC_FIVEM_TARGET/);
assert.match(source, /writeCatalog\(catalog\)/);
assert(workflow.includes('default: "10000"'));
assert(workflow.includes('default: "1200"'));
assert(workflow.includes("inputs.scriptblox_target || '10000'"));
assert(workflow.includes('tools/import-fivem.cjs'));
assert(workflow.includes('tools/expand-java.cjs'));
assert(workflow.includes('tools/import-java-library.cjs'));
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(index, /id="fivemTab"/);
assert.match(index, /id="fivemNav"/);
assert.match(index, /id="fivemTools"/);
assert(workflow.includes('branches: [main]'));
console.log('RCC FiveM importer checks passed.');
