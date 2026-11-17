import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const [sync, importer, ui, workflow, feed, vip] = await Promise.all([
  readFile(new URL('../tools/sync-community-feed.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tools/import-community.cjs', import.meta.url), 'utf8'),
  readFile(new URL('../assets/community-feed.js', import.meta.url), 'utf8'),
  readFile(new URL('../.github/workflows/refresh-community-catalog.yml', import.meta.url), 'utf8'),
  readFile(new URL('../community-feed.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../assets/vip-membership.js', import.meta.url), 'utf8')
]);
assert.equal(feed.schema, 'rcc-community-feed-v1');
assert(Array.isArray(feed.newest) && Array.isArray(feed.trending) && Array.isArray(feed.news));
assert.equal(feed.news.length, 5);
assert.match(sync, /RCC_COMMUNITY_PAGES \|\| 50/);
assert.match(sync, /const unchanged =/);
assert.match(sync, /news: Array\.isArray\(old\?\.news\)/);
assert.match(sync, /max: '20'/);
assert.match(sync, /limit: '48'/);
assert.match(sync, /patched: patched \? '1' : '0'/);
assert.match(sync, /fetchScriptBloxPages\(true\)/);
assert.doesNotMatch(sync, /row\.isPatched === true\) return null/);
assert.match(sync, /includeScript: 'false'/);
assert.match(sync, /codeIncluded: false/);
assert.doesNotMatch(sync, /row\.script\s*\|\|/);
assert.match(sync, /RSCRIPTS_API_KEY/);
assert(importer.includes('https://api.rscripts.net/v1/scripts'));
assert.match(importer, /RSCRIPTS_API_KEY/);
assert(importer.includes('item.risk?.score'));
assert(importer.includes("['safe', 'low risk']"));
assert.match(workflow, /schedule:/);
assert.match(workflow, /RSCRIPTS_API_KEY/);
assert.match(ui, /community-feed\.json/);
assert.match(ui, /scriptblox\.com/);
assert.match(ui, /rscripts\.net/);
assert.match(ui, /www\.r-scripts\.net/);
assert.match(ui, /noopener noreferrer/);
assert.match(ui, /⚠️ PARCHEADO/);
assert.match(ui, /Este código está parcheado en Roblox/);
assert.match(ui, /Sí, continuar/);
assert.match(ui, /No, volver/);
assert.match(vip, /VIP_PERCENTAGE = 45/);
const check = spawnSync(process.execPath, ['--check', new URL('../tools/sync-community-feed.mjs', import.meta.url).pathname], {encoding:'utf8'});
assert.equal(check.status, 0, check.stderr);

const importerCheck = spawnSync(process.execPath, ['--check', new URL('../tools/import-community.cjs', import.meta.url).pathname], {encoding:'utf8'});
assert.equal(importerCheck.status, 0, importerCheck.stderr);
const javaGeneratorCheck = spawnSync(process.execPath, ['--check', new URL('../tools/expand-java.cjs', import.meta.url).pathname], {encoding:'utf8'});
assert.equal(javaGeneratorCheck.status, 0, javaGeneratorCheck.stderr);
console.log('RCC community feed checks passed.');