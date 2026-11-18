// Ensure every catalog record carries one RCC classification tag.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');
const rows = readCatalog();
let changed = 0;
for (const row of rows) {
  if (row.catalog_section === 'java' && row.compatibility?.environment === 'JDK 17+') {
    row.compatibility.environment = 'java';
    changed++;
  }
  const previous = Array.isArray(row.tags) ? row.tags : [];
  const tags = [...new Set(previous.filter(tag => typeof tag === 'string' && tag.trim()))];
  if (!tags.includes('RCC')) tags.unshift('RCC');
  if (JSON.stringify(tags) !== JSON.stringify(previous)) {
    row.tags = tags;
    changed++;
  }
}
if (changed) writeCatalog(rows);
console.log('RCC tags: ' + changed + ' records normalized; ' + rows.length + ' total records checked.');
