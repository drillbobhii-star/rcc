// Static validation plus javac compilation for the original RCC Java library.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const examples = require('./java-library.cjs');
const javaImporter = fs.readFileSync(path.join(__dirname, 'import-java-library.cjs'), 'utf8');
assert.match(javaImporter, /const code =/);
assert.match(javaImporter, /existingJavaCode\.has\(code\)/);
assert.match(javaImporter, /code,/);
assert.match(javaImporter, /verification: 'java-compiled'/);

assert(Array.isArray(examples));
assert(examples.length >= 30, 'Expected at least 30 Java examples.');
const ids = new Set();
for (const example of examples) {
  assert.match(example.id, /^[a-z0-9-]+$/);
  assert(!ids.has(example.id), 'Duplicate Java example: ' + example.id);
  ids.add(example.id);
  assert.match(example.name, /^Java:/);
  assert(example.description.length >= 40);
  assert.match(example.code, /public class Main/);
  assert(example.code.includes('public static void main(String[] args)'), 'Missing Java main method: ' + example.id);
  assert(!example.code.includes('loadstring') && !example.code.includes('HttpGet') && !example.code.includes('Runtime.getRuntime().exec'));
}

const javac = spawnSync('javac', ['-version'], { encoding: 'utf8' });
if (javac.error?.code === 'ENOENT') {
  console.log('Java library static checks passed; javac is unavailable, compilation skipped.');
  process.exit(0);
}
if (javac.status !== 0) {
  throw new Error('javac could not report its version: ' + (javac.stderr || javac.stdout));
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rcc-java-'));
try {
  for (const [index, example] of examples.entries()) {
    const folder = path.join(root, String(index).padStart(2, '0'));
    fs.mkdirSync(folder, { recursive: true });
    const file = path.join(folder, 'Main.java');
    fs.writeFileSync(file, example.code.trim() + '\n', 'utf8');
    try {
      execFileSync('javac', ['-encoding', 'UTF-8', '-d', folder, file], {
        encoding: 'utf8',
        timeout: 20000,
        stdio: 'pipe'
      });
    } catch (error) {
      throw new Error('Java example failed to compile: ' + example.id + '\n' + (error.stderr || error.stdout || error.message));
    }
  }
  console.log('RCC Java checks passed: ' + examples.length + ' independent examples compiled with javac.');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
