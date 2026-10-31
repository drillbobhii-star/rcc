// Optional deep check; dependencies live outside the static site.
// npm install --prefix /tmp/rcc-validation luaparse@0.3.1 fengari-node-cli@0.1.0
// node tools/check-examples.cjs /tmp/rcc-validation/node_modules
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const dependencies = process.argv[2];
if (!dependencies) {
  console.error('Usage: node tools/check-examples.cjs <validation-node_modules-directory>');
  process.exit(1);
}
const dependencyRoot = path.resolve(dependencies);
const parser = require(path.join(dependencyRoot, 'luaparse'));
const interpreter = path.join(dependencyRoot, '.bin', 'fengari');
const catalog = require('./catalog-store.cjs').readCatalog();
const examples = catalog.filter(s => s.id.startsWith('lua_') || s.id.startsWith('learn_rbx_') || s.id.startsWith('rcc_recipe_'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rcc-lua-'));
const failures = [];
let parsed = 0, executed = 0;
try {
  for (const example of examples) {
    try {
      parser.parse(example.code, { luaVersion: '5.1' });
      parsed++;
      if (example.compatibility.environment !== 'lua') continue;
      const file = path.join(temporary, 'example.lua');
      fs.writeFileSync(file, example.code);
      const result = cp.spawnSync(interpreter, [file], { encoding: 'utf8', timeout: 3000 });
      if (result.status !== 0 || result.error || result.stderr) {
        throw new Error(result.stderr || result.error?.message || 'Interpreter failed');
      }
      executed++;
    } catch (error) { failures.push(`${example.id}: ${error.message}`); }
  }
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
assert.deepEqual(failures, []);
console.log(`Examples OK: ${parsed} syntax checks; ${executed} executions in Fengari (Lua 5.3 emulated). Roblox and external executors were not executed.`);
