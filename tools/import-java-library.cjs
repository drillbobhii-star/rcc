// Idempotently add the authored Java examples to the dedicated RCC Java section.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');
const examples = require('./java-library.cjs');

function main() {
  if (!Array.isArray(examples) || examples.length < 30) {
    throw new Error('The RCC Java library must contain at least 30 reviewed examples.');
  }

  const catalog = readCatalog().filter(item => !String(item.id).startsWith('rcc_java_'));
  const ids = new Set(catalog.map(item => item.id));
  const createdAt = process.env.RCC_IMPORT_DATE || new Date().toISOString().slice(0, 10);

  for (const example of examples) {
    const id = 'rcc_java_' + example.id;
    if (ids.has(id)) throw new Error('Duplicate Java example ID: ' + id);
    ids.add(id);

    catalog.push({
      id,
      name: example.name,
      description: example.description + ' Código original RCC, sin dependencias externas; compila con JDK 17 o posterior.',
      level: 'free',
      device: 'pc',
      platform: 'java',
      type: 'source',
      executors: ['JDK 17+ / OpenJDK'],
      tags: ['Java', 'Programación', 'Original RCC', example.category],
      version: '1.0',
      created_at: createdAt,
      file_extension: 'java',
      catalog_section: 'java',
      code: example.code.trim() + '\n',
      compatibility: {
        environment: 'java',
        runtime: 'Java 17+ · OpenJDK',
        context: 'Aplicación de consola independiente. Guarda el ejemplo como Main.java.',
        requirements: 'JDK 17 o posterior. Compila con javac Main.java y ejecuta con java Main. No requiere dependencias externas.',
        verification: 'javac-tested',
        executor_status: 'not-applicable',
        mobile_status: 'Ejemplo de consola para ordenador; no es una aplicación Android.',
        test_details: 'Código original RCC comprobado con javac en el flujo de validación.',
        sources: ['https://docs.oracle.com/en/java/javase/17/']
      }
    });
  }

  const manifest = writeCatalog(catalog);
  console.log('RCC Java: ' + examples.length + ' ejemplos originales; catálogo: ' + manifest.total + ' entradas.');
}

main();
