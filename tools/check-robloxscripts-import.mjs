import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { rowToEntry, trustedUrl } = require('../tools/import-robloxscripts.cjs');
const sample = {
  id: 'roblox-123', title: 'Example free Roblox script', slug: 'example-free-script',
  description: 'A public example for Roblox developers.', accessType: 'free',
  scriptPageUrl: 'https://robloxscripts.com/script/example-free-script',
  rawScriptUrl: 'https://robloxscripts.com/raw/example-free-script',
  createdAt: '2026-11-17T10:00:00Z',
  game: { name: 'Blox Fruits', placeId: '2753915549' },
  author: { username: 'ExampleDev', verified: true },
  tags: ['farming', 'farming', 'Roblox']
};
const entry = rowToEntry(sample, '2026-11-17T12:00:00Z');
assert.equal(entry.id, 'games_rbs_roblox-123');
assert.equal(entry.platform, 'roblox');
assert.equal(entry.catalog_section, 'games');
assert.equal(entry.type, 'loadstring');
assert.equal(entry.level, 'free');
assert.equal(entry.source_only, true);
assert.equal(entry.game_id, '2753915549');
assert(entry.description.includes('robloxscripts.com'));
assert(entry.code.includes('https://robloxscripts.com/raw/example-free-script'));
assert.equal(new Set(entry.tags).size, entry.tags.length);
assert.equal(entry.review.provider, 'RobloxScripts.com');
assert.equal(entry.review.status, 'unverified');
assert.equal(entry.review.declaredVerified, true);
assert.equal(rowToEntry({ ...sample, id: 'paid-123', accessType: 'paid' }), null);
assert.equal(rowToEntry({ ...sample, id: 'bad-123', title: 'Credential stealer' }), null);
assert.equal(rowToEntry({ ...sample, id: 'bad-123', rawScriptUrl: 'http://robloxscripts.com/raw/example' }), null);
assert.equal(rowToEntry({ ...sample, id: 'bad-123', rawScriptUrl: 'https://evil.example/raw/example' }), null);
assert.equal(trustedUrl('https://robloxscripts.com/raw/example', '/raw/'), 'https://robloxscripts.com/raw/example');
assert.equal(trustedUrl('https://evil.example/raw/example', '/raw/'), null);
const [workflow, docs, guide] = await Promise.all([
  readFile(new URL('../.github/workflows/expand-static-catalog.yml', import.meta.url), 'utf8'),
  readFile(new URL('../docs/rcc-community-catalog.md', import.meta.url), 'utf8'),
  readFile(new URL('../assets/assistant-guide.js', import.meta.url), 'utf8')
]);
assert(workflow.includes('tools/import-robloxscripts.cjs'));
assert(workflow.includes('robloxscripts_target'));
assert(docs.includes('RobloxScripts.com'));
assert(guide.includes('RobloxScripts.com'));
console.log('RCC RobloxScripts.com importer checks passed.');
