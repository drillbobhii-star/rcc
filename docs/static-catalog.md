# Catálogo estático compatible con Cloudflare Pages

El catálogo se publica como archivos estáticos JSON. No utiliza Functions, base de datos, compresión especial ni un paso de compilación para servir los códigos.

`scripts.json` contiene un índice pequeño con el número total de entradas y la lista de partes. Los archivos de `catalog/` contienen las entradas completas, incluido su código, sin modificar los identificadores, el contenido o el orden del catálogo. Cada parte ocupa como máximo 2 MiB, muy por debajo del límite de 25 MiB por archivo de Cloudflare Pages. El archivo original de 31,2 MiB se sustituyó por este índice; no se conservó ninguna copia grande en la carpeta publicada.

`assets/catalog-loader.js` descarga primero el índice y una parte. La interfaz muestra inmediatamente las primeras 36 tarjetas y permite explorarlas mientras descarga las partes restantes en lotes de hasta dos solicitudes. Entre lotes cede tiempo al navegador para atender la interacción. Al terminar activa los filtros y la búsqueda sobre el catálogo completo, conservando el orden, los identificadores y los códigos. El contador distingue la descarga en curso; si falla una parte, conserva la selección inicial e indica «Carga incompleta» con una opción de reintento.

La búsqueda espera 180 ms después de la última pulsación. Los recuentos por juego se calculan en una sola pasada y «Mostrar más» añade 36 tarjetas sin reconstruir las anteriores. Esta mejora reduce la espera inicial y el trabajo de la interfaz; la descarga total sigue realizándose en segundo plano.

Los nombres de las partes incluyen una huella SHA-256 truncada de su contenido. El cargador revalida `scripts.json` en cada carga y solicita las partes con `cache: 'force-cache'`: una URL de parte identifica contenido inmutable, por lo que el navegador puede reutilizarlo entre visitas. El índice nunca se trata como inmutable. La política HTTP/CDN publicada debe seguir alineada con esta distinción: revalidación para `scripts.json` y caché prolongada solo para `catalog/part-*.json` con nombre hasheado.

## Biblioteca Java

El catálogo incluye una sección independiente de Java 17, separada de los scripts Lua/Luau de Roblox y de la biblioteca JavaScript para navegador. Cada ejemplo es autocontenido, usa bibliotecas estándar y se identifica con la etiqueta `Java`. Para probarlo, guarda el código como `Main.java`, compila con `javac Main.java` y ejecuta `java Main`. Los ejemplos avanzados llevan la etiqueta `RCC Supporter`; el resto sigue disponible en el catálogo general. La verificación `java-compiled` corresponde a compilación y ejecución automatizadas con JDK 17, no a Roblox Studio.

## Biblioteca Java

El catálogo incluye una sección independiente de Java 17, separada de los scripts Lua/Luau de Roblox y de la biblioteca JavaScript para navegador. Cada ejemplo es autocontenido, usa bibliotecas estándar y se identifica con la etiqueta `Java`. Para probarlo, guarda el código como `Main.java`, compila con `javac Main.java` y ejecuta `java Main`. Los ejemplos avanzados llevan la etiqueta `RCC Supporter`; los otros ejemplos Java permanecen gratuitos. La verificación `java-compiled` corresponde a compilación y ejecución automatizadas con JDK 17, no a Roblox Studio.

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

## Revisión de fuentes y estados

`node tools/audit-sources.cjs` consulta metadatos públicos de las publicaciones ScriptBlox existentes y hasta 300 páginas recientes de RScripts. Añade como máximo 80 publicaciones gratuitas de juegos ausentes, conserva identificadores y cargadores existentes y no descarga ni ejecuta Lua remoto. `--resume` reintenta fichas pendientes del mismo informe; `--resume --history` incorpora las fechas de ediciones y notas publicadas para las fichas con cambios o parcheo. Las consultas fallidas no convierten una ficha en parcheada ni en funcional.

Cada entrada incluye procedencia y estado editorial en `review`. `patched` requiere `isPatched: true`; `source-unpatched` significa únicamente `isPatched: false`. La verificación técnica anterior permanece separada. `unknown` indica una publicación consultada sin estado declarado; `pending`, ausencia de contraste externo. `sourceUpdatedAt` usa la fecha de edición del contenido cuando está disponible, excluyendo promociones de ScriptBlox. El historial registra eventos publicados, sin inventar números de versión ni prometer un historial completo. Los cargadores siguen apuntando a su fuente actual; no se sustituyen por código de otra publicación.

`assets/catalog-audit.json` publica el alcance y las limitaciones de la consulta. Los comentarios externos no estuvieron disponibles en los endpoints consultados. Las fichas resumen únicamente los comentarios RCC que su servicio existente logra cargar, contando frases explícitas favorables, fallos y sanciones; no son una prueba de ejecución y las preguntas no se cuentan como afirmaciones. No se añaden registros de usuarios ni un almacén paralelo.

`node tools/check-script-review.cjs /ruta/a/node_modules` usa una instalación externa de jsdom para comprobar avisos, límites de las afirmaciones, enlaces, comentarios contradictorios, fallos del servicio, persistencia del tema naranja y preferencias de movimiento.

Para completar las referencias visuales de las publicaciones etiquetadas «Nueva incorporación», `node tools/refresh-game-images.cjs` consulta las miniaturas públicas de Roblox por identificador del lugar y actualiza `assets/game-images.json`. Solo registra resultados completados de la CDN de Roblox y conserva las referencias existentes. Son iconos de los juegos, no capturas de ejecución de los scripts. Las importaciones de RScripts también conservan las imágenes declaradas de sus rutas públicas de juegos y scripts; la interfaz prueba esa alternativa si falla la imagen principal, antes de mostrar la ilustración de respaldo.

## Corrección de carga de noviembre de 2026

El catálogo conserva 15.023 entradas, con los mismos identificadores, códigos y orden. El índice, las partes y la lista de identificadores de la API se regeneraron juntos. Se normalizó la etiqueta RCC y los ejemplos JavaScript se clasificaron en la plataforma web. El total incluye ejemplos educativos y referencias de terceros; no implica que todos los códigos hayan sido ejecutados o verificados.

La descarga continúa automáticamente después de la primera parte, sin esperar un clic, una búsqueda o un evento de navegación. La prueba estática simula también un navegador sin interacción para detectar una regresión de este bloqueo. Los ejemplos Java no verificados conservan ese estado y se distinguen de los 48 ejemplos de la biblioteca con validación de compilación.
