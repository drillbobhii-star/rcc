// Remove only legacy bulk-import placeholder entries; real script code is preserved.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');

const APPLY = process.argv.includes('--apply');
const MARKER = 'RCC: código no incluido automáticamente';

function isPlaceholder(row) {
  return typeof row?.code === 'string' && row.code.includes(MARKER);
}

function main() {
  const rows = readCatalog();
  const removed = rows.filter(isPlaceholder);
  const kept = rows.filter(row => !isPlaceholder(row));

  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY_RUN',
    before: rows.length,
    matched: removed.length,
    after: kept.length,
    sample: removed.slice(0, 12).map(row => ({ id: row.id, name: row.name, source_url: row.source_url }))
  }, null, 2));

  if (!APPLY) {
    console.log('Simulación únicamente. Ejecuta con --apply para modificar el catálogo.');
    return;
  }
  if (!removed.length) {
    console.log('No hay fichas con el texto de reemplazo. No se modificó el catálogo.');
    return;
  }

  writeCatalog(kept);
  const verified = readCatalog();
  const leftovers = verified.filter(isPlaceholder);
  if (verified.length !== kept.length || leftovers.length) {
    throw new Error('Verificación fallida: el catálogo no quedó limpio.');
  }
  console.log('Limpieza completada:', removed.length, 'fichas eliminadas; quedan', verified.length, 'registros.');
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
module.exports = { isPlaceholder };
