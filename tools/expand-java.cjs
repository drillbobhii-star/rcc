// Generate the independent Java catalogue from the reviewed RCC library.
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');
const library = require('./java-expanded-library.cjs');
const catalog = readCatalog();
const ids = new Set(catalog.map(entry => entry.id));
for (const item of library) {
  const code = [
    '// RCC | Ejemplo independiente de Java 17',
    '// Guarda este archivo como Main.java; compila con javac Main.java y ejecuta java Main.',
    'import java.util.*;', 'import java.math.*;', 'import java.time.*;', 'import java.time.temporal.ChronoUnit;',
    'import java.nio.file.*;', 'import java.nio.charset.StandardCharsets;', 'import java.util.concurrent.*;',
    'import java.util.concurrent.atomic.*;', 'import java.util.regex.*;', 'import java.util.stream.*;',
    'public class Main {', '  public static void main(String[] args) throws Exception {',
    ...item.body.split('\n').map(line => '    ' + line), '  }',
    ...(item.helpers ? item.helpers.split('\n').map(line => '  ' + line) : []), '}'
  ].join('\n') + '\n';
  const entry = {
    id: item.id, name: 'Java: ' + item.name,
    description: item.description + ' Ejemplo autocontenido en Java 17, sin dependencias externas. ' + (item.premium ? 'Contenido avanzado reservado para RCC Supporter.' : 'Disponible en el catálogo gratuito.'),
    level: 'free', device: 'both', platform: 'java', type: 'source', executors: ['JDK 17+ (javac / java)'],
    tags: ['Original RCC', 'Java', 'Programación', item.topic, item.level, ...(item.premium ? ['RCC Supporter'] : [])],
    version: '1.0', created_at: '2026-11-17', catalog_section: 'java', file_extension: 'java', code,
    compatibility: { environment: 'java', runtime: 'Java 17+ / JDK', context: 'Guarda el contenido como Main.java. Compila con javac Main.java y ejecútalo con java Main.', requirements: 'JDK 17 o compatible. Solo bibliotecas estándar; sin claves, red ni dependencias externas.', verification: 'java-compiled', executor_status: 'not-applicable', test_details: 'Compilado y ejecutado automáticamente con JDK 17 en las comprobaciones de RCC. No es código Lua/Luau ni se ejecuta dentro de Roblox.', mobile_status: 'Requiere una JVM/JDK compatible; no se ha probado en dispositivos Android o iOS.', sources: ['https://dev.java/learn/', 'https://docs.oracle.com/en/java/javase/17/docs/api/'] }
  };
  const existingIndex = catalog.findIndex(current => current.id === item.id);
  if (existingIndex >= 0) catalog[existingIndex] = { ...catalog[existingIndex], ...entry };
  else catalog.push(entry);
  ids.add(item.id);
}
writeCatalog(catalog);
console.log('Java examples: ' + library.length + '. Total: ' + catalog.length);
