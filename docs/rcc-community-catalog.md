# RCC Community Catalog

## Qué añade

- Sincroniza hasta 1,000 registros recientes de ScriptBlox por ejecución (50 páginas × 20).
- Puede sincronizar hasta 2,400 registros de Rscripts (50 páginas × 48) si se configura su clave API.
- Consulta los listados de tendencias de ambas fuentes.
- Mantiene metadatos, fuente, juego, fecha, autor, estado de verificación y enlaces originales.
- No descarga ni guarda el código Lua de terceros. Las fichas abren la publicación original.
- Conserva las novedades editoriales de FiveM entre sincronizaciones.
- Descubre repositorios públicos de GitHub por temas: Roblox/Luau, FiveM, Java, JavaScript, GameGuardian, AutoTouch, Minecraft, Godot, Unity y Python.
- Indexa publicaciones de recursos FiveM desde la categoría Releases pública de Cfx.re como fichas externas con enlace original, framework/etiquetas y precio señalado cuando la fuente lo indica.

## Actualización automática

GitHub Actions ejecuta `.github/workflows/refresh-community-catalog.yml` cada seis horas. También se puede lanzar desde Actions → Refresh RCC community catalog → Run workflow.

## Importación adicional al catálogo estático

Al fusionar `.github/workflows/expand-rcc-catalog.yml` en `main`, GitHub Actions ejecutará una expansión inicial una sola vez. Luego puede volver a lanzarse desde Actions → Expand RCC catalog → Run workflow; el workflow usa `workflow_dispatch` para las siguientes ampliaciones.

El workflow `.github/workflows/expand-static-catalog.yml` se ejecuta una sola vez cuando se incorpora por primera vez a `main`; después se puede ejecutar manualmente o de forma diaria.

El workflow manual **Expand RCC catalog** permite solicitar hasta 10,000 fichas Roblox nuevas de ScriptBlox y hasta 1,200 fichas FiveM de Cfx.re por ejecución. ScriptBlox importa publicaciones gratuitas, recientes y declaradas no parcheadas; cuando existe el secreto `RSCRIPTS_API_KEY`, también consulta Rscripts v1 y acepta solo fichas con análisis explícito `Safe` o `Low Risk` y puntuación de riesgo máxima 3. Configura el secreto en GitHub → Settings → Secrets and variables → Actions. El importador compara IDs y URLs de origen para evitar duplicados, aplica una lista preventiva de títulos de alto riesgo y añade únicamente metadatos y enlaces al origen; no descarga ni ejecuta el código externo. Las fichas importadas permanecen como `unverified` hasta una revisión técnica independiente. La cantidad final puede ser menor que el objetivo solicitado si las páginas contienen duplicados, riesgos no evaluados o entradas que no superan los filtros. Las fichas FiveM son enlaces externos de recursos; no contienen archivos ni código remoto descargado por RCC. El contador definitivo se actualiza solo después de que el workflow ejecute la importación y valide los registros.

## Activar Rscripts

1. Crear una API key desde el panel de cuenta de Rscripts.
2. En GitHub → Settings → Secrets and variables → Actions, crear el secreto `RSCRIPTS_API_KEY`.
3. Volver a ejecutar el workflow.

La clave nunca se expone en el navegador ni se guarda en el repositorio.

## Límites y confianza

- ScriptBlox: se consultan por separado publicaciones gratuitas parcheadas y no parcheadas; ninguna se elimina del feed. Las parcheadas llevan una etiqueta y confirmación antes de abrir el enlace.
- Rscripts: se consultan listados públicos, gratuitos y filtrados por su API.
- El estado `verified` corresponde a la plataforma de origen, no a una verificación de RCC.
- RCC no afirma que un script externo funcione ni lo ejecuta.
- Los datos externos se presentan como descubrimientos; para incorporarlos al catálogo ejecutable estático se requiere revisión independiente.
- El feed no sustituye el catálogo local ni cambia su contador de códigos. Los repositorios que solo aparecen en Novedades no se suman al total de scripts alojados en RCC; las fichas FiveM son enlaces externos de recursos, no código descargado. Los repositorios que solo aparecen en Novedades no se suman al total de scripts alojados en RCC; las fichas FiveM son recursos externos enlazados, no código descargado por RCC.

## VIP

El catálogo reserva el 45% de fichas no-Java mediante selección determinista; los ejemplos Java avanzados llevan la etiqueta `RCC Supporter` explícita. El cálculo determinista por ID se aplica a todos los scripts locales, incluidos los de nuevos juegos y plataformas. Los enlaces de fuentes externas siguen siendo publicaciones de terceros y no se presentan como contenido alojado o protegido por RCC.
