# Ampliación con fuentes originales

La ampliación del 18 de noviembre de 2026 añadió 16.392 archivos de código reales a las 15.023 entradas existentes, para un total de 31.415. Se conservaron las entradas anteriores. Los archivos nuevos procedieron de nueve repositorios independientes: TheAlgorithms/Python, TheAlgorithms/Java, trekhleb/javascript-algorithms, Roblox/roact, Roblox/rodux, eugenp/tutorials, overextended/ox_lib, qbcore-framework/qb-core y qbox-project/qbx_core. No se dependió de ScriptBlox.

| Catálogo | Archivos nuevos |
| --- | ---: |
| Java | 14.581 |
| Universal (Python) | 1.363 |
| FiveM | 215 |
| JavaScript / Web | 172 |
| Roblox / Luau | 61 |

Los archivos se importaron desde revisiones fijas y conservaron la atribución y el texto de su licencia original. Los avisos NOTICE de raíz también se conservan cuando existen. Las licencias GPL y LGPL siguen aplicándose a sus respectivos archivos; los enlaces al proyecto original permiten consultar el conjunto de fuentes y dependencias. Los archivos de subdirectorios con una licencia propia se excluyen de esta importación automática para evitar atribuirles la licencia de la raíz.

Se compararon identificadores, direcciones de origen y hashes SHA-256 del contenido. Los duplicados se omitieron. Los archivos se trataron como datos, sin ejecutar código externo. Las comprobaciones de contenido son limitadas y no constituyen una auditoría de seguridad. «Código original importado» indica procedencia, no funcionamiento verificado. Algunos archivos son módulos de proyectos mayores y requieren dependencias; no todos son programas independientes ni scripts para ejecutores Roblox.

El informe `assets/source-import-report.json` conserva los repositorios, las licencias, las revisiones, los hashes de los archivos comprimidos, los recuentos y los descartes. No se afirmó que hubiera cientos de miles de scripts por catálogo ni se rellenaron catálogos con código inventado.

Para repetir o ampliar la importación editorial se ejecuta `node tools/import-source-archives.cjs`. Requiere Node, Python 3 y acceso público a GitHub y codeload. No requiere credenciales. Los archivos comprimidos se guardan temporalmente fuera del repositorio y nunca se extraen ni ejecutan. El catálogo se publica con el empaquetado estático existente. Después se ejecuta `npm test`.

Las fichas muestran la imagen de la publicación cuando está disponible, después una referencia del juego y, en su defecto, una ilustración local por categoría. Las ilustraciones se identifican explícitamente y no se presentan como capturas del script.

El directorio de personas consulta perfiles públicos registrados, con paginación. Las sugerencias buscan en el directorio completo por nombre público o por un usuario Roblox que su propietario haya elegido mostrar. Se actualizan al enfocar la búsqueda, al volver a la ventana, al pulsar Actualizar y cada minuto mientras la página está visible. No enumeran correos electrónicos ni cuentas privadas de autenticación.
