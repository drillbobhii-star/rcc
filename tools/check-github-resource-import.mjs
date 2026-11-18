import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { CATEGORIES, fileAllowed, makeEntry } = require('./import-github-resources.cjs');

const category = key => CATEGORIES.find(item => item.key === key);
const roblox = category('roblox');
const fiveM = category('fivem');
const gg = category('gameguardian');
const autoTouch = category('autotouch');
const web = category('web');
const java = category('java');
const universal = category('universal');
assert.equal(CATEGORIES.length, 7);
const repo = (full_name, description, topics = []) => ({
  id: 12345, full_name, name: full_name.split('/')[1], description,
  default_branch: 'main', topics, license: { spdx_id: 'MIT' }
});
const file = (path, size = 1024) => ({ type: 'blob', path, size, sha: 'abc123' });

assert.equal(fileAllowed(roblox, repo('demo/roblox-luau', 'Roblox Luau Studio modules', ['roblox','luau']), file('src/Inventory.luau')), true);
assert.equal(fileAllowed(roblox, repo('demo/roblox-executor', 'Roblox Luau executor exploit', ['roblox','luau']), file('src/loader.lua')), false);
assert.equal(fileAllowed(fiveM, repo('demo/fivem-resource', 'FiveM QBCore resource', ['fivem','qbcore']), file('client/main.lua')), true);
assert.equal(fileAllowed(gg, repo('demo/gg-template', 'GameGuardian Lua script template', ['gameguardian']), file('template.lua')), true);
assert.equal(fileAllowed(gg, repo('demo/gg-cheat', 'GameGuardian speed hack and bypass', ['gameguardian']), file('speed.lua')), false);
assert.equal(fileAllowed(autoTouch, repo('demo/auto-touch-scripts', 'AutoTouch Lua automation examples', ['autotouch']), file('tap.lua')), true);
assert.equal(fileAllowed(web, repo('demo/browser-userscripts', 'JavaScript browser userscripts', ['userscript']), file('src/example.user.js')), true);
assert.equal(fileAllowed(java, repo('demo/java-examples', 'Java programming examples', ['java','examples']), file('src/Main.java')), true);
assert.equal(fileAllowed(universal, repo('demo/lua-utils', 'Lua command line utilities', ['lua']), file('scripts/format.lua')), true);
assert.equal(fileAllowed(java, repo('demo/java-examples', 'Java examples', ['java']), file('src/Main.java', 200000)), false);
assert.equal(fileAllowed(web, repo('demo/browser-userscripts', 'JavaScript userscripts', ['userscript']), file('dist/app.min.js')), false);

const entry = makeEntry(roblox, repo('demo/roblox-luau', 'Roblox Luau Studio modules', ['roblox','luau']), file('src/Inventory.luau'));
assert.equal(entry.platform, 'roblox');
assert.equal(entry.source_only, true);
assert.equal(entry.tags.includes('RCC'), true);
assert.equal(entry.tags.includes('GitHub'), false);
assert.doesNotMatch(entry.description, /GitHub|demo\/roblox-luau/i);
assert.match(entry.source_url, /^https:\/\/github\.com\//);
assert.match(entry.code, /Abrir código original/);
assert.equal(entry.compatibility.verification, 'source-linked');

console.log('GitHub resource importer checks passed.');
