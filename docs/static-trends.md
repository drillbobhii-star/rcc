# Tendencias desde Cloudflare Pages

La interfaz sigue siendo HTML, CSS y JavaScript estáticos. No necesita Functions en Cloudflare, Supabase ni claves de base de datos en el navegador.

El navegador consulta una API independiente alojada en el proyecto Netlify existente. Esa API guarda las acciones y consulta el ranking en Netlify Database. La integración reutiliza la tabla `catalog_actions` y su clave única por identificador de navegador, script, acción y día UTC. No modifica las migraciones aplicadas.

## Publicación

Los archivos estáticos se publican en Cloudflare Pages como antes. El proyecto Netlify debe publicar también la versión actualizada de `netlify/functions/trends.mts`, con su base de datos vinculada. Publicar solo los archivos estáticos no actualiza el servidor de tendencias. El despliegue del proyecto Netlify administra la función y las migraciones automáticamente.

`assets/trends-config.js` contiene únicamente la URL pública del servicio: `https://cosmic-cucurucho-6280c8.netlify.app/api/trends`. Cuando la interfaz se abre en Netlify o en el entorno local, utiliza `/api/trends` en ese mismo origen para poder validar el despliegue correspondiente.

La API permite solicitudes CORS desde `https://rcc-3m0.pages.dev`, sus subdominios de preview y su propio origen. Atiende la preconsulta `OPTIONS` y no utiliza credenciales de terceros. Si el sitio cambia de dominio, actualiza también la lista de orígenes permitidos en la función; cambiar únicamente la URL del cliente no concede acceso a un dominio nuevo.

## Actualización y recuento

Tendencias se consulta al abrir la sección, cada minuto mientras está visible, al volver a la pestaña, al recuperar conexión y mediante el botón de actualización. Una copia se registra después de que el portapapeles confirma el éxito; una descarga se registra al iniciarla. Copiar un enlace o abrir una ficha no aumenta los contadores.

El ranking suma copias y descargas de los últimos 30 días UTC y devuelve los primeros 200 scripts, con desempate por identificador. El cliente cruza los identificadores con el catálogo publicado y después aplica los filtros visibles. No inventa popularidad para llenar una sección sin actividad.

Los totales se conservan en la base de datos compartida. El navegador conserva únicamente un identificador anónimo para deduplicar acciones sin cookies de terceros. Borrar ese identificador o utilizar otro dispositivo representa otro navegador; estos recuentos no son una medición de usuarios únicos autenticados. Si el almacenamiento del navegador está bloqueado, el identificador dura hasta cerrar la página.

Una solicitud fallida no impide copiar ni descargar. La interfaz informa del fallo de registro. Si falla la lectura, conserva el último ranking válido de esa visita, lo identifica como desactualizado y permite reintentar. No se requiere volver a publicar Cloudflare para actualizar las tendencias.

## Comprobaciones

`node --experimental-strip-types tools/check-release17.mjs` valida el catálogo y la API, incluidos CORS, preconsultas, validación de identificadores y fallos de almacenamiento.

`node tools/check-catalog-navigation.cjs /ruta/a/node_modules` necesita `jsdom` instalado fuera del repositorio. Prueba los manejadores reales del catálogo con respuestas de red simuladas: navegación entre secciones, filtros ocultos, etiquetas removibles, recientes, dispositivos, actualización de tendencias y recuperación de errores. No contacta servicios externos ni ejecuta los scripts del catálogo.
