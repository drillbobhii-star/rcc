# RCC Community Catalog

## Qué añade

- Importa publicaciones gratuitas recientes de ScriptBlox; la API accesible permite hasta 500 páginas por ejecución en esta revisión.
- Importa hasta 3,000 fichas gratuitas de RobloxScripts.com por ejecución (API pública sin clave, hasta 200 páginas × 50; con atribución visible).
- Puede importar hasta 3,000 registros de Rscripts si se configura su clave API.
- Consulta los listados de tendencias de ambas fuentes.
- Mantiene metadatos, fuente, juego, fecha, autor, estado de verificación y enlaces originales.
- No descarga ni guarda el código Lua de terceros. Las fichas abren la publicación original.
- Conserva las novedades editoriales de FiveM entre sincronizaciones.
- Descubre repositorios públicos de GitHub por temas: Roblox/Luau, FiveM, Java, JavaScript, GameGuardian, AutoTouch, Minecraft, Godot, Unity y Python.
- Indexa publicaciones de recursos FiveM desde la categoría Releases pública de Cfx.re como fichas externas con enlace original, framework/etiquetas y precio señalado cuando la fuente lo indica.
- Para ampliar la búsqueda FiveM también se consultan directorios públicos como [LXR Dev](https://lxrdev.com/Community/free-scripts), [Pigeon Studios](https://pigeonstudios.co.uk/free/), [Resourced](https://resourced.dev/scripts), [MSK Scripts](https://www.msk-scripts.de/en/fivem/free), [YBN Limax](https://ybnlimax.com/free-scripts/), [Force Developments](https://forcedevelopments.com/free) y [FreeScriptsHub](https://freescriptshub.com/). Son índices externos que mezclan scripts, librerías, mapas, ropa, vehículos y recursos de pago; no se cuentan como scripts importados sin revisar cada ficha.

## Actualización automática

GitHub Actions ejecuta `.github/workflows/refresh-community-catalog.yml` cada seis horas. También se puede lanzar desde Actions → Refresh RCC community catalog → Run workflow.

## Importación adicional al catálogo estático

El workflow `.github/workflows/expand-static-catalog.yml` se ejecuta una sola vez cuando se incorpora por primera vez a `main`; después se puede ejecutar manualmente o de forma diaria.

El workflow manual **RCC Catalog Expansion** permite solicitar hasta 10,000 fichas Roblox de ScriptBlox, hasta 10,000 de RobloxScripts.com, hasta 3,000 de Rscripts cuando se configura `RSCRIPTS_API_KEY` y hasta 1,200 fichas FiveM de Cfx.re por ejecución. ScriptBlox importa publicaciones gratuitas, recientes y declaradas no parcheadas; RobloxScripts.com usa su API pública gratuita, con atribución visible y sin descargar el código; cuando existe el secreto `RSCRIPTS_API_KEY`, también consulta Rscripts v1 y acepta solo fichas con análisis explícito `Safe` o `Low Risk` y puntuación de riesgo máxima 3. Configura el secreto en GitHub → Settings → Secrets and variables → Actions. El importador compara IDs y URLs de origen para evitar duplicados, aplica una lista preventiva de títulos de alto riesgo y añade únicamente metadatos y enlaces al origen; no descarga ni ejecuta el código externo. Las fichas importadas permanecen como `unverified` hasta una revisión técnica independiente. La cantidad final puede ser menor que el objetivo solicitado si las páginas contienen duplicados, riesgos no evaluados o entradas que no superan los filtros. Las fichas FiveM son enlaces externos de recursos; no contienen archivos ni código remoto descargado por RCC. El contador definitivo se actualiza solo después de que el workflow ejecute la importación y valide los registros.

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

## VIP

El catálogo reserva el 45% de fichas no-Java mediante selección determinista; los ejemplos Java avanzados llevan la etiqueta `RCC Supporter` explícita. El cálculo determinista por ID se aplica a todos los scripts locales, incluidos los de nuevos juegos y plataformas. Los enlaces de fuentes externas siguen siendo publicaciones de terceros y no se presentan como contenido alojado o protegido por RCC.
