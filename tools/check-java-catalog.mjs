import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const catalog = require('./catalog-store.cjs').readCatalog();
const examples = catalog.filter(item => item.id.startsWith('rcc_java_'));
assert.equal(examples.length, 48, 'Expected 48 Java examples');
assert.equal(new Set(examples.map(item => item.code)).size, examples.length, 'Java examples must have unique source code');
assert(examples.some(item => item.tags.includes('RCC Supporter')), 'Some advanced Java examples must be reserved for RCC Supporter');
const compiler = spawnSync('javac', ['-version'], { encoding: 'utf8' });
if (compiler.error || compiler.status !== 0) {
  if (process.env.RCC_REQUIRE_JAVA === '1') throw new Error('JDK 17+ is required for Java catalogue validation');
  console.log('Java static checks passed; javac is unavailable, so compilation was skipped.');
} else {
  for (const item of examples) {
    assert.equal(item.platform, 'java', item.id);
    assert.equal(item.catalog_section, 'java', item.id);
    assert.equal(item.compatibility.verification, 'java-compiled', item.id);
    assert(item.code.startsWith('// RCC | Ejemplo independiente de Java 17'), item.id);
    assert.doesNotMatch(item.code, /ProcessBuilder|Runtime\\.getRuntime\\(\\)\\.exec|HttpClient|new Socket\\(/, item.id);
    const dir = mkdtempSync(join(tmpdir(), 'rcc-java-'));
    try {
      const source = join(dir, 'Main.java');
      writeFileSync(source, item.code, 'utf8');
      const compiled = spawnSync('javac', ['-encoding', 'UTF-8', '-d', dir, source], { encoding: 'utf8', timeout: 10000 });
      assert.equal(compiled.status, 0, item.id + ': ' + (compiled.stderr || compiled.error?.message || 'javac failed'));
      const executed = spawnSync('java', ['-cp', dir, 'Main'], { encoding: 'utf8', timeout: 5000 });
      assert.equal(executed.status, 0, item.id + ': ' + (executed.stderr || executed.error?.message || 'java failed'));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  console.log('Java catalogue checks passed: 48 examples compiled and executed with the installed JDK.');
}
