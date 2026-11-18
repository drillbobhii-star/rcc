// Ensure every catalog record carries the RCC classification tag.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');
const rows = readCatalog();
let changed = 0;
for (const row of rows) {
  if (!Array.isArray(row.tags)) row.tags = [];
  if (!row.tags.includes('RCC')) {
    row.tags.unshift('RCC');
    changed++;
  }
}
if (changed) writeCatalog(rows);
console.log('RCC tags: ' + changed + ' records updated; ' + rows.length + ' total records checked.');
