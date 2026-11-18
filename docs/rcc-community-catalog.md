# RCC Community Catalog

## Qué añade

- Importa publicaciones gratuitas recientes de ScriptBlox; la API accesible permite hasta 500 páginas por ejecución en esta revisión.
- Importa hasta 3,000 fichas gratuitas de RobloxScripts.com por ejecución (API pública sin clave, hasta 200 páginas × 50; con atribución visible).
- Puede importar hasta 3,000 registros de Rscripts si se configura su clave API.
- Consulta los listados de tendencias de ambas fuentes.
- Mantiene metadatos, fuente, juego, fecha, autor, estado de verificación y enlaces originales.
- No descarga ni guarda el código Lua de terceros. Las fichas abren la publicación original.
- Conserva las novedades editoriales de FiveM entre sincronizaciones.
- Indexa archivos fuente públicos por siete áreas RCC: Roblox/Luau, FiveM, GameGuardian (solo material de aprendizaje), AutoTouch, JavaScript/Web, Java y Universal (Lua, Python, Shell y PowerShell). Los repositorios con licencia permisiva reconocida y texto íntegro de licencia pueden aportar código junto con su cabecera legal y enlace de atribución; el límite total por ejecución es 1,800 archivos de código. El resto se muestra como ficha source-only que abre el original. RCC no ejecuta los archivos.
- Indexa publicaciones de recursos FiveM desde la categoría Releases pública de Cfx.re como fichas externas con enlace original, framework/etiquetas y precio señalado cuando la fuente lo indica.
- Para ampliar la búsqueda FiveM también se consultan directorios públicos como [LXR Dev](https://lxrdev.com/Community/free-scripts), [Pigeon Studios](https://pigeonstudios.co.uk/free/), [Resourced](https://resourced.dev/scripts), [MSK Scripts](https://www.msk-scripts.de/en/fivem/free), [YBN Limax](https://ybnlimax.com/free-scripts/), [Force Developments](https://forcedevelopments.com/free) y [FreeScriptsHub](https://freescriptshub.com/). Son índices externos que mezclan scripts, librerías, mapas, ropa, vehículos y recursos de pago; no se cuentan como scripts importados sin revisar cada ficha.

## Actualización automática

GitHub Actions ejecuta `.github/workflows/refresh-community-catalog.yml` cada seis horas. También se puede lanzar desde Actions → Refresh RCC community catalog → Run workflow.

## Importación adicional al catálogo estático

El workflow `.github/workflows/expand-static-catalog.yml` se ejecuta una sola vez cuando se incorpora por primera vez a `main`; después se puede ejecutar manualmente o de forma diaria.

El workflow manual **RCC Catalog Expansion** permite solicitar hasta 10,000 fichas ScriptBlox, hasta 10,000 fichas RobloxScripts.com, hasta 3,000 fichas RScripts si se configura `RSCRIPTS_API_KEY`, hasta 1,200 recursos FiveM de Cfx.re y hasta 2,500 metadatos JavaScript de Greasy Fork. ScriptBlox importa publicaciones gratuitas, recientes y declaradas no parcheadas; RobloxScripts.com usa su API pública gratuita y requiere atribución visible; RScripts acepta solo fichas con análisis `Safe` o `Low Risk` y puntuación de riesgo máxima 3. Configura `RSCRIPTS_API_KEY` en GitHub → Settings → Secrets and variables → Actions. Greasy Fork utiliza su API JSON de solo lectura (100 registros por página), importa únicamente metadatos JavaScript y no descarga el código.

El indexador de GitHub busca en siete categorías y revisa hasta 100–120 repositorios por categoría. Puede incorporar código solo si identifica una licencia permisiva reconocida (MIT, Apache-2.0, BSD, ISC, 0BSD, Unlicense, Zlib o CC0) y encuentra el archivo completo de licencia en el repositorio; la licencia y la URL original se añaden en la cabecera del código importado. Se limita a 1,800 descargas de archivos por ejecución. Si no hay licencia compatible, no se copia el código: se crea una ficha con enlace a la fuente original. GameGuardian se limita a plantillas y documentación; AutoTouch se centra en Lua. Se excluyen dependencias, builds, minificados, tests, código generado y patrones asociados a robo de credenciales, malware, bypass y exploits. Los archivos de Roblox se etiquetan sin nombre de proveedor cuando no hay una obligación de atribución; si una fuente exige atribución, se conserva.

Las fichas no ejecutadas permanecen `unverified`. Las entradas de directorios FiveM y las fichas source-only son enlaces externos, no archivos alojados por RCC. El paso `tag-rcc-catalog.cjs` añade `RCC` a todos los registros existentes y nuevos. El contador definitivo solo cambia después de que el workflow importe y valide los registros. El número final puede ser menor que el objetivo si hay duplicados, archivos sin licencia reutilizable o entradas que no superan los filtros.

## Fuentes consultadas

- Roblox Creator Hub: [bibliotecas de scripting Luau](https://create.roblox.com/docs/resources/scripting-libraries) y [documentación de Luau](https://create.roblox.com/docs/luau).
- Repositorio oficial de código y herramientas Roblox: [github.com/Roblox](https://github.com/Roblox); los módulos MIT se pueden importar respetando su licencia y atribución.
- FiveM: [Cfx.re Releases](https://forum.cfx.re/c/releases/7), [LXR Dev](https://lxrdev.com/Community/free-scripts), [Resourced](https://resourced.dev/), [Force Developments](https://forcedevelopments.com/free), [KrakenCore](https://www.krakencore.org/resources) y la lista comunitaria [Awesome FiveM Scripts](https://github.com/rpScripts/awesome-fivem-scripts). Estos directorios mezclan recursos de distintos tipos; cada ficha debe clasificarse antes de importarse.
- GameGuardian: [documentación de scripting Lua](https://docs.gameguardian.net/).
- AutoTouch: [guía oficial de Lua](https://docs.autotouch.net/lua/).
- JavaScript/Web: [API pública de Greasy Fork](https://greasyfork.org/en/help/api) y [OpenUserJS](https://openuserjs.org/about).
- Universal: [temas públicos de PowerShell](https://github.com/topics/powershell) y repositorios de automatización y utilidades.

Las fuentes son puntos de descubrimiento, no una garantía de seguridad ni licencia para copiar el contenido.

## Activar Rscripts

1. Crear una API key desde el panel de cuenta de Rscripts.
2. En GitHub → Settings → Secrets and variables → Actions, crear el secreto `RSCRIPTS_API_KEY`.
3. Volver a ejecutar el workflow.

La clave nunca se expone en el navegador ni se guarda en el repositorio.

## Límites y confianza

- ScriptBlox: el catálogo importa publicaciones gratuitas recientes y declaradas no parcheadas; el feed puede mostrar también metadatos parcheados con advertencias.
- RobloxScripts.com: fichas gratuitas enlazadas al origen; RCC no descarga el código, no lo ejecuta ni lo declara seguro. La fuente solicita atribución visible.
- Rscripts: se consultan listados públicos, gratuitos y filtrados por su API.
- El estado `verified` corresponde a la plataforma de origen, no a una verificación de RCC.
- RCC no afirma que un script externo funcione ni lo ejecuta.
- Los datos externos se presentan como descubrimientos; para incorporarlos al catálogo ejecutable estático se requiere revisión independiente.
- El feed no sustituye el catálogo local. Los repositorios que solo aparecen en Novedades no se suman al contador de scripts. Las fichas externas de Roblox y FiveM enlazan publicaciones originales; no contienen código de terceros alojado por RCC.

## VIP temporalmente pausado

Durante el regalo comunitario se ocultan las puertas VIP y se concede acceso abierto a las cuentas autenticadas. Se conservan las membresías, el webhook de Ko-fi, la integración de Discord y la administración para poder reactivar el modelo más adelante. El inicio de sesión continúa siendo obligatorio para ver, copiar o abrir fuentes de scripts.
