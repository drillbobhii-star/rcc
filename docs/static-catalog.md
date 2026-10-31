# Catálogo estático compatible con Cloudflare Pages

El catálogo se publica como archivos estáticos JSON. No utiliza Functions, base de datos, compresión especial ni un paso de compilación para servir los códigos.

`scripts.json` contiene un índice pequeño con el número total de entradas y la lista de partes. Los archivos de `catalog/` contienen las entradas completas, incluido su código, sin modificar los identificadores, el contenido o el orden del catálogo. Cada parte ocupa como máximo 2 MiB, muy por debajo del límite de 25 MiB por archivo de Cloudflare Pages. El archivo original de 31,2 MiB se sustituyó por este índice; no se conservó ninguna copia grande en la carpeta publicada.

`assets/catalog-loader.js` descarga el índice y las partes, con un máximo de tres solicitudes simultáneas. Reúne las entradas en su orden original, comprueba los recuentos y los identificadores, y entrega el mismo catálogo completo a la interfaz existente. La búsqueda, los filtros, los favoritos, los enlaces a fichas, las tendencias y la copia o descarga del código conservan su funcionamiento. La interfaz muestra el progreso y permite reintentar si falla una parte; no presenta un catálogo parcial como si estuviera completo.

Los nombres de las partes incluyen una huella de su contenido. Las solicitudes revalidan la caché para evitar mezclar versiones del índice y de los datos.

## Publicación

Publica `scripts.json`, la carpeta `catalog/`, el nuevo cargador y los archivos estáticos habituales. El despliegue debe incluirlos juntos, como ocurre al publicar la revisión completa del repositorio. La configuración existente de Cloudflare Pages no requiere un nuevo comando de compilación.

La división resuelve el límite de tamaño de los archivos; no elimina la descarga total del catálogo, que sigue conteniendo todos los códigos. No depende de que el servidor comprima respuestas para cumplir el límite.

## Actualización del catálogo

Las herramientas de importación y ampliación utilizan `tools/catalog-store.cjs` para leer y escribir el catálogo. La escritura mantiene las partes por debajo de 2 MiB, regenera el índice y la lista de identificadores de la API, y retira las partes antiguas que ya no se utilizan.

Para nuevas herramientas en CommonJS:

```js
const { readCatalog, writeCatalog } = require('./catalog-store.cjs');
const catalog = readCatalog();
// Añadir o modificar entradas del catálogo.
writeCatalog(catalog);
```

No reemplaces `scripts.json` por una lista gigante. Las pruebas y herramientas existentes ya leen el nuevo formato mediante el mismo módulo.

## Comprobación

`npm run test:static` comprueba los límites de tamaño de los archivos fuente publicables, los tamaños y las huellas de las partes, la correspondencia con los identificadores de la API y la carga completa en el navegador simulado. También prueba errores de descarga, reintentos, duplicados, rutas inválidas y la escritura de futuras partes con caracteres Unicode.

La comprobación de navegación con DOM también utiliza el cargador y los archivos divididos reales, con la red simulada: `node tools/check-catalog-navigation.cjs /ruta/a/node_modules`. Necesita `jsdom` instalado fuera del repositorio.
