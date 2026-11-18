import assert from 'node:assert/strict';
const { readCatalog } = require('./catalog-store.cjs');
const rows = readCatalog();
assert(rows.length > 0);
for (const row of rows) {
  assert(Array.isArray(row.tags), row.id + ': tags must be an array');
  assert(row.tags.includes('RCC'), row.id + ': missing RCC tag');
  assert.equal(new Set(row.tags).size, row.tags.length, row.id + ': duplicate tags');
}
console.log('RCC tag check passed: ' + rows.length + ' catalog records.');
