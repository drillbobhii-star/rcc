# RCC Community Catalog

## Qué añade

- Sincroniza hasta 1,000 registros recientes de ScriptBlox por ejecución (50 páginas × 20).
- Puede sincronizar hasta 2,400 registros de Rscripts (50 páginas × 48) si se configura su clave API.
- Consulta los listados de tendencias de ambas fuentes.
- Mantiene metadatos, fuente, juego, fecha, autor, estado de verificación y enlaces originales.
- No descarga ni guarda el código Lua de terceros. Las fichas abren la publicación original.
- Conserva las novedades editoriales de FiveM entre sincronizaciones.

## Actualización automática

GitHub Actions ejecuta `.github/workflows/refresh-community-catalog.yml` cada seis horas. También se puede lanzar desde Actions → Refresh RCC community catalog → Run workflow.

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
- El feed no sustituye el catálogo local ni cambia su contador de códigos.

## VIP

El catálogo local pasa de 35% a 40% de fichas VIP. El cálculo determinista por ID se aplica a todos los scripts locales, incluidos los de nuevos juegos y plataformas. Los enlaces de fuentes externas siguen siendo publicaciones de terceros y no se presentan como contenido alojado o protegido por RCC.
